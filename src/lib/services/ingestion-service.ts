// CORE LOGIC - avoid editing unless assigned

import { EntryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { mapQualtricsToNormalized } from "@/lib/qualtrics/adapter";
import { validateNormalizedPayload } from "@/lib/validation/qualtrics";
import { buildLabMatchKey } from "@/lib/domain/lab-matching";
import { fetchAndParseWebsiteText } from "@/lib/scraping/fetch-and-parse";
import { getSummarizerProvider } from "@/lib/llm/service";
import { evaluateFieldUpdatesWithLlm } from "@/lib/llm/update-evaluator";
import { semesterLabelFromDate } from "@/lib/domain/snapshot";
import { formatRequirementBullets } from "@/lib/domain/requirements";
import { recordSurveyResponseForFacultyEmail } from "@/lib/services/campaign-service";
import { syncFacultyRowsToGoogleSheet } from "@/lib/publication/google-sheets";

interface IngestInput {
  payload: unknown;
  source: "qualtrics" | "manual";
  qualtricsResponseId?: string;
  submittedAt?: Date;
  waveId?: string;
  syncGoogleSheet?: boolean;
}

function normalizeEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function normalizeDiffValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function trimWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}.`;
}

function formatSurveyQualifications(value?: string | null): string | null {
  return formatRequirementBullets(value, {
    maxItems: 3,
    maxWordsPerItem: 18,
  });
}

function chooseUpdatedString(
  field: string,
  updateFields: Set<string>,
  proposedValue: string | null | undefined,
  baselineValue: string | null | undefined,
): string | null {
  if (updateFields.has(field)) {
    return proposedValue ?? null;
  }

  return baselineValue ?? null;
}

function chooseUpdatedBoolean(
  field: string,
  updateFields: Set<string>,
  proposedValue: boolean,
  baselineValue: boolean,
): boolean {
  if (updateFields.has(field)) {
    return proposedValue;
  }

  return baselineValue;
}

function buildLabIdentityUpdates(
  lab: {
    labName: string;
    facultyName: string;
    facultyEmail: string | null;
    websiteUrl: string | null;
  },
  payload: {
    labName: string;
    facultyName: string;
    websiteUrl?: string;
  },
  facultyEmail?: string,
): Prisma.LabUpdateInput {
  const updates: Prisma.LabUpdateInput = {};

  if (payload.labName && payload.labName !== lab.labName) {
    updates.labName = payload.labName;
  }

  if (payload.facultyName && payload.facultyName !== lab.facultyName) {
    updates.facultyName = payload.facultyName;
  }

  if (payload.websiteUrl && payload.websiteUrl !== lab.websiteUrl) {
    updates.websiteUrl = payload.websiteUrl;
  }

  if (facultyEmail && facultyEmail !== (lab.facultyEmail ?? "").toLowerCase()) {
    updates.facultyEmail = facultyEmail;
  }

  return updates;
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
      select: {
        id: true,
        labId: true,
        ingestionStatus: true,
        lab: {
          select: {
            facultyEmail: true,
          },
        },
      },
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
          facultyEmail: normalizeEmail(existingSubmission.lab.facultyEmail ?? undefined),
        };
      }
    }

    const afterDeleteSubmission = await prisma.labSubmission.findUnique({
      where: { qualtricsResponseId },
      select: {
        id: true,
        labId: true,
        lab: {
          select: {
            facultyEmail: true,
          },
        },
      },
    });

    if (afterDeleteSubmission) {
      return {
        ok: true,
        duplicate: true,
        labId: afterDeleteSubmission.labId,
        submissionId: afterDeleteSubmission.id,
        facultyEmail: normalizeEmail(afterDeleteSubmission.lab.facultyEmail ?? undefined),
      };
    }
  }

  const normalizedPayload = mapQualtricsToNormalized(payload as Record<string, unknown>);
  const validation = validateNormalizedPayload(normalizedPayload);
  const matchKey = buildLabMatchKey(normalizedPayload);
  const facultyEmail = normalizeEmail(normalizedPayload.facultyEmail);

  const existingLabByEmail = facultyEmail
    ? await prisma.lab.findFirst({
        where: {
          facultyEmail: {
            equals: facultyEmail,
            mode: "insensitive",
          },
        },
      })
    : null;

  const existingLabByName = await prisma.lab.findFirst({
    where: {
      labName: normalizedPayload.labName,
    },
  });

  const existingLab = existingLabByEmail ?? existingLabByName;

  let lab =
    existingLab ??
    (await prisma.lab.create({
      data: {
        labName: normalizedPayload.labName || `Unknown lab (${matchKey})`,
        facultyName: normalizedPayload.facultyName || "Unknown Faculty",
        facultyEmail,
        websiteUrl: normalizedPayload.websiteUrl,
        currentStatus: validation.valid ? EntryStatus.pending_summary : EntryStatus.pending_ingestion,
      },
    }));

  const identityUpdates = buildLabIdentityUpdates(
    lab,
    {
      labName: normalizedPayload.labName,
      facultyName: normalizedPayload.facultyName,
      websiteUrl: normalizedPayload.websiteUrl,
    },
    facultyEmail,
  );

  if (Object.keys(identityUpdates).length > 0) {
    lab = await prisma.lab.update({
      where: { id: lab.id },
      data: identityUpdates,
    });
  }

  const resolvedFacultyEmail = facultyEmail ?? normalizeEmail(lab.facultyEmail ?? undefined);

  const submission = await prisma.labSubmission.create({
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
      facultyEmail: resolvedFacultyEmail,
    };
  }

  const latestApprovedSnapshot = await prisma.labSnapshot.findFirst({
    where: {
      labId: lab.id,
      status: EntryStatus.approved,
    },
    orderBy: { lastVerifiedAt: "desc" },
  });

  const scrapeResult = await fetchAndParseWebsiteText(normalizedPayload.websiteUrl);
  const summarizer = getSummarizerProvider();
  const summary = await summarizer.summarize({
    labName: normalizedPayload.labName,
    facultyName: normalizedPayload.facultyName,
    researchArea: normalizedPayload.researchArea,
    surveyNotes: normalizedPayload.optionalNotes,
    websiteText: scrapeResult.sourceText,
  });

  const summaryText = trimWords(summary.structured?.summary ?? summary.outputText, 70);
  const surveyQualifications = formatSurveyQualifications(normalizedPayload.desiredSkills);
  const surveyFallbackQualifications = formatSurveyQualifications(normalizedPayload.optionalNotes);
  const proposedQualifications =
    surveyQualifications ?? surveyFallbackQualifications ?? "- Not specified";

  const baseline = {
    labName: latestApprovedSnapshot ? lab.labName : undefined,
    facultyName: latestApprovedSnapshot ? lab.facultyName : undefined,
    websiteUrl: latestApprovedSnapshot?.websiteUrl ?? lab.websiteUrl,
    researchArea: latestApprovedSnapshot?.researchArea,
    recruitingUndergrads: latestApprovedSnapshot?.recruitingUndergrads ?? false,
    optionalNotes: latestApprovedSnapshot?.optionalNotes,
    desiredSkills: latestApprovedSnapshot?.desiredSkills,
    summaryText: latestApprovedSnapshot?.summaryText,
    sourceText: latestApprovedSnapshot?.sourceText,
  };

  const candidate = {
    labName: normalizedPayload.labName || lab.labName,
    facultyName: normalizedPayload.facultyName || lab.facultyName,
    websiteUrl: normalizedPayload.websiteUrl ?? lab.websiteUrl,
    researchArea: normalizedPayload.researchArea,
    recruitingUndergrads: normalizedPayload.recruitingUndergrads,
    optionalNotes: normalizedPayload.optionalNotes,
    desiredSkills: proposedQualifications,
    summaryText,
    sourceText: scrapeResult.sourceText,
  };

  const changedFields = [
    { field: "labName", previousValue: baseline.labName ?? "", nextValue: candidate.labName ?? "" },
    {
      field: "facultyName",
      previousValue: baseline.facultyName ?? "",
      nextValue: candidate.facultyName ?? "",
    },
    {
      field: "websiteUrl",
      previousValue: baseline.websiteUrl ?? "",
      nextValue: candidate.websiteUrl ?? "",
    },
    {
      field: "researchArea",
      previousValue: baseline.researchArea ?? "",
      nextValue: candidate.researchArea ?? "",
    },
    {
      field: "recruitingUndergrads",
      previousValue: String(baseline.recruitingUndergrads),
      nextValue: String(candidate.recruitingUndergrads),
    },
    {
      field: "optionalNotes",
      previousValue: baseline.optionalNotes ?? "",
      nextValue: candidate.optionalNotes ?? "",
    },
    {
      field: "desiredSkills",
      previousValue: baseline.desiredSkills ?? "",
      nextValue: candidate.desiredSkills ?? "",
    },
    {
      field: "summaryText",
      previousValue: baseline.summaryText ?? "",
      nextValue: candidate.summaryText ?? "",
    },
    {
      field: "sourceText",
      previousValue: baseline.sourceText ?? "",
      nextValue: candidate.sourceText ?? "",
    },
  ].filter((entry) => normalizeDiffValue(entry.previousValue) !== normalizeDiffValue(entry.nextValue));

  if (changedFields.length === 0 && latestApprovedSnapshot) {
    await prisma.labSnapshot.update({
      where: { id: latestApprovedSnapshot.id },
      data: {
        lastVerifiedAt: effectiveSubmittedAt,
      },
    });

    await prisma.labSubmission.update({
      where: { id: submission.id },
      data: {
        ingestionStatus: EntryStatus.approved,
      },
    });

    const campaignMatch =
      source === "qualtrics" && resolvedFacultyEmail
        ? await recordSurveyResponseForFacultyEmail(resolvedFacultyEmail, latestApprovedSnapshot.id, {
            waveId,
            respondedAt: effectiveSubmittedAt,
          })
        : { matched: false };

    const googleSheetSync =
      source === "qualtrics" && (syncGoogleSheet ?? true) && resolvedFacultyEmail
        ? await syncFacultyRowsToGoogleSheet([resolvedFacultyEmail])
        : undefined;

    return {
      ok: true,
      labId: lab.id,
      snapshotId: latestApprovedSnapshot.id,
      noFieldUpdates: true,
      facultyEmail: resolvedFacultyEmail,
      campaignMatched: campaignMatch.matched,
      googleSheetSync,
      scrapeWarning: scrapeResult.ok ? undefined : scrapeResult.error,
    };
  }

  const fieldDecision = await evaluateFieldUpdatesWithLlm({
    labName: candidate.labName,
    websiteText: scrapeResult.sourceText,
    changedFields,
  });

  const suggestReject =
    Boolean(summary.structured?.suggestReject) || fieldDecision.suggestReject;
  const rejectReason = summary.structured?.rejectReason ?? fieldDecision.rejectReason;

  if (suggestReject) {
    const pendingSnapshot = await prisma.labSnapshot.create({
      data: {
        labId: lab.id,
        recruitingUndergrads: candidate.recruitingUndergrads,
        researchArea: candidate.researchArea,
        optionalNotes: candidate.optionalNotes,
        desiredSkills: candidate.desiredSkills,
        websiteUrl: candidate.websiteUrl,
        sourceText: candidate.sourceText,
        summaryText: candidate.summaryText,
        lastVerifiedAt: effectiveSubmittedAt,
        status: EntryStatus.pending_review,
        statusProvenance: "from_survey",
        summaryProvenance: "from_llm",
        semesterLabel: semesterLabelFromDate(),
        isLatest: latestApprovedSnapshot ? false : true,
        needsConfirmation: true,
        llmRejectSuggestion: true,
        llmRejectReason: rejectReason,
      },
    });

    await prisma.summaryDraft.create({
      data: {
        labSnapshotId: pendingSnapshot.id,
        generatorType: summary.provider,
        promptVersion: summary.promptVersion,
        inputText: `${normalizedPayload.researchArea ?? ""}\n${scrapeResult.sourceText}`,
        outputText: candidate.summaryText,
        reviewStatus: "pending_review",
      },
    });

    await prisma.lab.update({
      where: { id: lab.id },
      data: {
        currentStatus: EntryStatus.pending_review,
        facultyEmail: resolvedFacultyEmail,
      },
    });

    await prisma.labSubmission.update({
      where: { id: submission.id },
      data: {
        ingestionStatus: EntryStatus.pending_review,
      },
    });

    const campaignMatch =
      source === "qualtrics" && resolvedFacultyEmail
        ? await recordSurveyResponseForFacultyEmail(resolvedFacultyEmail, pendingSnapshot.id, {
            waveId,
            respondedAt: effectiveSubmittedAt,
          })
        : { matched: false };

    return {
      ok: true,
      labId: lab.id,
      snapshotId: pendingSnapshot.id,
      needsConfirmation: true,
      rejectReason,
      facultyEmail: resolvedFacultyEmail,
      campaignMatched: campaignMatch.matched,
      scrapeWarning: scrapeResult.ok ? undefined : scrapeResult.error,
    };
  }

  const updateFields = new Set(fieldDecision.fieldsToUpdate);

  if (latestApprovedSnapshot && updateFields.size === 0) {
    await prisma.labSnapshot.update({
      where: { id: latestApprovedSnapshot.id },
      data: {
        lastVerifiedAt: effectiveSubmittedAt,
      },
    });

    await prisma.labSubmission.update({
      where: { id: submission.id },
      data: {
        ingestionStatus: EntryStatus.approved,
      },
    });

    const campaignMatch =
      source === "qualtrics" && resolvedFacultyEmail
        ? await recordSurveyResponseForFacultyEmail(resolvedFacultyEmail, latestApprovedSnapshot.id, {
            waveId,
            respondedAt: effectiveSubmittedAt,
          })
        : { matched: false };

    const googleSheetSync =
      source === "qualtrics" && (syncGoogleSheet ?? true) && resolvedFacultyEmail
        ? await syncFacultyRowsToGoogleSheet([resolvedFacultyEmail])
        : undefined;

    return {
      ok: true,
      labId: lab.id,
      snapshotId: latestApprovedSnapshot.id,
      noFieldUpdates: true,
      facultyEmail: resolvedFacultyEmail,
      campaignMatched: campaignMatch.matched,
      googleSheetSync,
      scrapeWarning: scrapeResult.ok ? undefined : scrapeResult.error,
    };
  }

  const resolved = latestApprovedSnapshot
    ? {
        recruitingUndergrads: chooseUpdatedBoolean(
          "recruitingUndergrads",
          updateFields,
          candidate.recruitingUndergrads,
          latestApprovedSnapshot.recruitingUndergrads,
        ),
        researchArea: chooseUpdatedString(
          "researchArea",
          updateFields,
          candidate.researchArea,
          latestApprovedSnapshot.researchArea,
        ),
        optionalNotes: chooseUpdatedString(
          "optionalNotes",
          updateFields,
          candidate.optionalNotes,
          latestApprovedSnapshot.optionalNotes,
        ),
        desiredSkills: chooseUpdatedString(
          "desiredSkills",
          updateFields,
          candidate.desiredSkills,
          latestApprovedSnapshot.desiredSkills,
        ),
        websiteUrl: chooseUpdatedString(
          "websiteUrl",
          updateFields,
          candidate.websiteUrl,
          latestApprovedSnapshot.websiteUrl,
        ),
        sourceText: chooseUpdatedString(
          "sourceText",
          updateFields,
          candidate.sourceText,
          latestApprovedSnapshot.sourceText,
        ),
        summaryText: chooseUpdatedString(
          "summaryText",
          updateFields,
          candidate.summaryText,
          latestApprovedSnapshot.summaryText,
        ),
      }
    : {
        recruitingUndergrads: candidate.recruitingUndergrads,
        researchArea: candidate.researchArea ?? null,
        optionalNotes: candidate.optionalNotes ?? null,
        desiredSkills: candidate.desiredSkills ?? null,
        websiteUrl: candidate.websiteUrl ?? null,
        sourceText: candidate.sourceText ?? null,
        summaryText: candidate.summaryText ?? null,
      };

  await prisma.labSnapshot.updateMany({
    where: { labId: lab.id, isLatest: true },
    data: { isLatest: false },
  });

  const approvedSnapshot = await prisma.labSnapshot.create({
    data: {
      labId: lab.id,
      recruitingUndergrads: resolved.recruitingUndergrads,
      researchArea: resolved.researchArea,
      optionalNotes: resolved.optionalNotes,
      desiredSkills: resolved.desiredSkills,
      websiteUrl: resolved.websiteUrl,
      sourceText: resolved.sourceText,
      summaryText: resolved.summaryText,
      lastVerifiedAt: effectiveSubmittedAt,
      status: EntryStatus.approved,
      statusProvenance: "from_survey",
      summaryProvenance: "from_llm",
      semesterLabel: semesterLabelFromDate(),
      isLatest: true,
      needsConfirmation: false,
      llmRejectSuggestion: false,
      llmRejectReason: null,
    },
  });

  await prisma.summaryDraft.create({
    data: {
      labSnapshotId: approvedSnapshot.id,
      generatorType: summary.provider,
      promptVersion: summary.promptVersion,
      inputText: `${normalizedPayload.researchArea ?? ""}\n${scrapeResult.sourceText}`,
      outputText: resolved.summaryText ?? candidate.summaryText,
      reviewStatus: "approved",
    },
  });

  await prisma.lab.update({
    where: { id: lab.id },
    data: {
      currentStatus: EntryStatus.approved,
      labName: chooseUpdatedString("labName", updateFields, candidate.labName, lab.labName) ?? lab.labName,
      facultyName:
        chooseUpdatedString("facultyName", updateFields, candidate.facultyName, lab.facultyName) ??
        lab.facultyName,
      facultyEmail: resolvedFacultyEmail,
      websiteUrl: resolved.websiteUrl,
    },
  });

  await prisma.labSubmission.update({
    where: { id: submission.id },
    data: {
      ingestionStatus: EntryStatus.approved,
    },
  });

  const campaignMatch =
    source === "qualtrics" && resolvedFacultyEmail
      ? await recordSurveyResponseForFacultyEmail(resolvedFacultyEmail, approvedSnapshot.id, {
          waveId,
          respondedAt: effectiveSubmittedAt,
        })
      : { matched: false };

  const googleSheetSync =
    source === "qualtrics" && (syncGoogleSheet ?? true) && resolvedFacultyEmail
      ? await syncFacultyRowsToGoogleSheet([resolvedFacultyEmail])
      : undefined;

  return {
    ok: true,
    labId: lab.id,
    snapshotId: approvedSnapshot.id,
    facultyEmail: resolvedFacultyEmail,
    campaignMatched: campaignMatch.matched,
    googleSheetSync,
    scrapeWarning: scrapeResult.ok ? undefined : scrapeResult.error,
  };
}
