// CORE LOGIC - avoid editing unless assigned

import { EntryStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { canTransitionStatus } from "@/lib/domain/status";
import { getSummarizerProvider } from "@/lib/llm/service";

export async function approveSnapshot(snapshotId: string, actorId: string) {
  const snapshot = await prisma.labSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }
  if (!canTransitionStatus(snapshot.status, EntryStatus.approved)) {
    throw new Error("Invalid state transition");
  }

  const updated = await prisma.labSnapshot.update({
    where: { id: snapshotId },
    data: { status: EntryStatus.approved },
  });

  await prisma.lab.update({
    where: { id: snapshot.labId },
    data: { currentStatus: EntryStatus.approved },
  });

  await prisma.summaryDraft.updateMany({
    where: { labSnapshotId: snapshotId },
    data: { reviewStatus: ReviewStatus.approved },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "LabSnapshot",
      entityId: snapshotId,
      action: "approve",
      actorType: "admin",
      actorId,
    },
  });

  return updated;
}

export async function rejectSnapshot(snapshotId: string, actorId: string) {
  const snapshot = await prisma.labSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }
  if (!canTransitionStatus(snapshot.status, EntryStatus.rejected)) {
    throw new Error("Invalid state transition");
  }

  const updated = await prisma.labSnapshot.update({
    where: { id: snapshotId },
    data: { status: EntryStatus.rejected },
  });

  await prisma.lab.update({
    where: { id: snapshot.labId },
    data: { currentStatus: EntryStatus.rejected },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "LabSnapshot",
      entityId: snapshotId,
      action: "reject",
      actorType: "admin",
      actorId,
    },
  });

  return updated;
}

export async function editSummary(snapshotId: string, outputText: string, actorId: string) {
  if (!outputText.trim()) {
    throw new Error("empty summary");
  }

  await prisma.labSnapshot.update({
    where: { id: snapshotId },
    data: {
      summaryText: outputText,
      summaryProvenance: "from_manual_edit",
    },
  });

  await prisma.summaryDraft.create({
    data: {
      labSnapshotId: snapshotId,
      generatorType: "manual",
      promptVersion: "manual-edit",
      inputText: "manual",
      outputText,
      reviewStatus: "pending_review",
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "LabSnapshot",
      entityId: snapshotId,
      action: "edit_summary",
      actorType: "admin",
      actorId,
      metadata: { outputTextLength: outputText.length },
    },
  });
}

export async function regenerateSummary(snapshotId: string, actorId: string) {
  const snapshot = await prisma.labSnapshot.findUnique({
    where: { id: snapshotId },
    include: { lab: true },
  });

  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  const provider = getSummarizerProvider();
  const summary = await provider.summarize({
    labName: snapshot.lab.labName,
    researchArea: snapshot.researchArea ?? undefined,
    surveyNotes: snapshot.optionalNotes ?? undefined,
    websiteText: snapshot.sourceText ?? undefined,
  });

  await prisma.labSnapshot.update({
    where: { id: snapshotId },
    data: {
      summaryText: summary.outputText,
      summaryProvenance: "from_llm",
      status: "pending_review",
    },
  });

  await prisma.summaryDraft.create({
    data: {
      labSnapshotId: snapshotId,
      generatorType: summary.provider,
      promptVersion: summary.promptVersion,
      inputText: snapshot.sourceText ?? "",
      outputText: summary.outputText,
      reviewStatus: "pending_review",
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "LabSnapshot",
      entityId: snapshotId,
      action: "regenerate_summary",
      actorType: "admin",
      actorId,
    },
  });
}
