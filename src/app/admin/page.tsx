"use client";

import { useQuery } from "@tanstack/react-query";

type SnapshotItem = {
  id: string;
  status: string;
  summaryText: string | null;
  sourceText: string | null;
  lastVerifiedAt: string;
  lab: {
    labName: string;
    department: string;
  };
};

async function getSubmissions(): Promise<SnapshotItem[]> {
  const res = await fetch("/api/admin/submissions", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load submissions.");
  }
  return res.json();
}

async function postAction(action: string, snapshotId: string, summaryText?: string) {
  const endpoint =
    action === "regenerate_summary" ? "/api/admin/regenerate-summary" : "/api/admin/review";

  const body =
    action === "regenerate_summary"
      ? { snapshotId }
      : {
          snapshotId,
          action,
          summaryText,
        };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Action failed: ${action}`);
  }
}

export default function AdminPage() {
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: getSubmissions,
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900">Admin review dashboard</h1>
        <button
          onClick={async () => {
            await fetch("/api/mock/ingest", { method: "POST" });
            await refetch();
          }}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Ingest mock submission
        </button>
      </div>

      {isLoading ? <p className="mt-4 text-sm">Loading submissions...</p> : null}
      {isError ? <p className="mt-4 text-sm text-rose-700">Error loading submissions.</p> : null}

      <div className="mt-6 space-y-4">
        {(data ?? []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">{item.lab.labName}</h2>
            <p className="text-sm text-slate-700">{item.lab.department}</p>
            <p className="mt-2 text-sm text-slate-700">Status: {item.status}</p>
            <p className="mt-2 text-sm text-slate-700">Summary: {item.summaryText ?? "(empty)"}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Parsed website text</summary>
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{item.sourceText ?? "No parsed source text."}</p>
            </details>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await postAction("approve", item.id);
                  await refetch();
                }}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Approve
              </button>
              <button
                onClick={async () => {
                  await postAction("reject", item.id);
                  await refetch();
                }}
                className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  const next = prompt("Edit summary", item.summaryText ?? "") ?? "";
                  await postAction("edit_summary", item.id, next);
                  await refetch();
                }}
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Edit summary
              </button>
              <button
                onClick={async () => {
                  await postAction("regenerate_summary", item.id);
                  await refetch();
                }}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Regenerate summary
              </button>
            </div>
          </article>
        ))}
      </div>

      <button
        onClick={async () => {
          await fetch("/api/admin/publication/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Research Starters Hub Weekly" }),
          });
          await refetch();
        }}
        className="mt-8 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Trigger newsletter export
      </button>
    </section>
  );
}
