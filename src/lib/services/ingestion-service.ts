// CORE LOGIC - avoid editing unless assigned

import { EntryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { mapQualtricsToNormalized } from "@/lib/qualtrics/adapter";
import { validateNormalizedPayload } from "@/lib/validation/qualtrics";
import { buildLabMatchKey } from "@/lib/domain/lab-matching";
import { fetchAndParseWebsiteText } from "@/lib/scraping/fetch-and-parse";
import { getSummarizerProvider } from "@/lib/llm/service";
import { semesterLabelFromDate } from "@/lib/domain/snapshot";
import { recordSurveyResponseForFacultyEmail } from "@/lib/services/campaign-service";
import { syncLatestSnapshotsToGoogleSheet } from "@/lib/publication/google-sheets";

interface IngestInput {
  payload: unknown;
  source: "qualtrics" | "manual";
  qualtricsResponseId?: string;
  submittedAt?: Date;
  waveId?: string;
  syncGoogleSheet?: boolean;
}

export async function ingestSurveySubmission({
  payload,
  source,
  qualtricsResponseId,
  submittedAt,
  waveId,
  syncGoogleSheet,
}: IngestInput) {
  const effectiveSubmittedAt = submittedAt ?? new Date();

  if (source === "qualtrics" && qualtricsResponseId) {
    const existingSubmission = await prisma.labSubmission.findUnique({
      where: { qualtricsResponseId },
      select: { id: true, labId: true, ingestionStatus: true },
    });

    if (existingSubmission) {
      if (existingSubmission.ingestionStatus === EntryStatus.pending_ingestion) {
        await prisma.labSubmission.delete({
          where: { id: existingSubmission.id },
        });
      } else {
        return {
          ok: true,
          duplicate: true,
          labId: existingSubmission.labId,
          submissionId: existingSubmission.id,
        };
      }
    }

    const afterDeleteSubmission = await prisma.labSubmission.findUnique({
      where: { qualtricsResponseId },
      select: { id: true, labId: true },
    });

    if (afterDeleteSubmission) {
      return {
        ok: true,
        duplicate: true,
        labId: afterDeleteSubmission.labId,
        submissionId: afterDeleteSubmission.id,
      };
    }
  }

  const normalizedPayload = mapQualtricsToNormalized(payload as Record<string, unknown>);
  const validation = validateNormalizedPayload(normalizedPayload);
  const matchKey = buildLabMatchKey(normalizedPayload);

  const existingLab = await prisma.lab.findFirst({
    where: {
      labName: normalizedPayload.labName,
      department: normalizedPayload.department,
    },
  });

  const lab =
    existingLab ??
    (await prisma.lab.create({
      data: {
        labName: normalizedPayload.labName || `Unknown lab (${matchKey})`,
        facultyName: normalizedPayload.facultyName || "Unknown Faculty",
        facultyEmail: normalizedPayload.facultyEmail,
        department: normalizedPayload.department || "Unknown Department",
        websiteUrl: normalizedPayload.websiteUrl,
        currentStatus: validation.valid ? EntryStatus.pending_summary : EntryStatus.pending_ingestion,
      },
    }));

  await prisma.labSubmission.create({
    data: {
      labId: lab.id,
      source,
      qualtricsResponseId,
      waveId,
      rawPayload: payload as Prisma.InputJsonValue,
      normalizedPayload: normalizedPayload as unknown as Prisma.InputJsonValue,
      submittedAt: effectiveSubmittedAt,
      ingestionStatus: validation.valid ? EntryStatus.pending_summary : EntryStatus.pending_ingestion,
      validationErrors: validation.valid ? undefined : validation.errors,
    },
  });

  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      labId: lab.id,
    };
  }

  await prisma.labSnapshot.updateMany({
    where: { labId: lab.id, isLatest: true },
    data: { isLatest: false },
  });

  const scrapeResult = await fetchAndParseWebsiteText(normalizedPayload.websiteUrl);
  const summarizer = getSummarizerProvider();
  const summary = await summarizer.summarize({
    labName: normalizedPayload.labName,
    researchArea: normalizedPayload.researchArea,
    surveyNotes: normalizedPayload.optionalNotes,
    websiteText: scrapeResult.sourceText,
  });

  const snapshot = await prisma.labSnapshot.create({
    data: {
      labId: lab.id,
      recruitingUndergrads: normalizedPayload.recruitingUndergrads,
      researchArea: normalizedPayload.researchArea,
      optionalNotes: normalizedPayload.optionalNotes,
      desiredSkills: normalizedPayload.desiredSkills,
      websiteUrl: normalizedPayload.websiteUrl,
      sourceText: scrapeResult.sourceText,
      summaryText: summary.outputText,
      lastVerifiedAt: effectiveSubmittedAt,
      status: EntryStatus.pending_review,
      statusProvenance: "from_survey",
      summaryProvenance: summary.provider === "mock" ? "from_llm" : "from_llm",
      semesterLabel: semesterLabelFromDate(),
      isLatest: true,
    },
  });

  await prisma.summaryDraft.create({
    data: {
      labSnapshotId: snapshot.id,
      generatorType: summary.provider,
      promptVersion: summary.promptVersion,
      inputText: `${normalizedPayload.researchArea ?? ""}\n${scrapeResult.sourceText}`,
      outputText: summary.outputText,
      reviewStatus: "pending_review",
    },
  });

  await prisma.lab.update({
    where: { id: lab.id },
    data: {
      currentStatus: EntryStatus.pending_review,
      facultyName: normalizedPayload.facultyName,
      facultyEmail: normalizedPayload.facultyEmail,
      websiteUrl: normalizedPayload.websiteUrl,
    },
  });

  const campaignMatch =
    source === "qualtrics" && normalizedPayload.facultyEmail
      ? await recordSurveyResponseForFacultyEmail(normalizedPayload.facultyEmail, snapshot.id, {
          waveId,
          respondedAt: effectiveSubmittedAt,
        })
      : { matched: false };

  const googleSheetSync =
    source === "qualtrics" && (syncGoogleSheet ?? true)
      ? await syncLatestSnapshotsToGoogleSheet()
      : undefined;

  return {
    ok: true,
    labId: lab.id,
    snapshotId: snapshot.id,
    campaignMatched: campaignMatch.matched,
    googleSheetSync,
    scrapeWarning: scrapeResult.ok ? undefined : scrapeResult.error,
  };
}
