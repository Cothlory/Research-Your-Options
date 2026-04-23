"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LabCard, type LabCardModel } from "@/components/beginner-safe/LabCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/beginner-safe/EmptyLoadingError";

async function fetchLabs(): Promise<LabCardModel[]> {
  const response = await fetch("/api/opportunities", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load opportunities.");
  }
  return response.json();
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [recruiting, setRecruiting] = useState("all");
  const searchInputId = "opportunities-search";
  const recruitingSelectId = "opportunities-recruiting";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["opportunities"],
    queryFn: fetchLabs,
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((item) => {
      const matchesSearch =
        !search ||
        item.labName.toLowerCase().includes(search.toLowerCase()) ||
        (item.researchArea ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesRecruiting =
        recruiting === "all" ||
        String(item.recruitingUndergrads) === recruiting;

      return matchesSearch && matchesRecruiting;
    });
  }, [data, recruiting, search]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Research opportunities</h1>
      <p className="mt-2 text-sm text-slate-700">
        Search by lab name or topic, then filter by recruiting status.
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label htmlFor={searchInputId} className="text-sm font-semibold text-slate-800">
          Search by lab name or topic
          <input
            id={searchInputId}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g., neuroscience, materials"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600"
          />
        </label>

        <label htmlFor={recruitingSelectId} className="text-sm font-semibold text-slate-800">
          Recruiting status
          <select
            id={recruitingSelectId}
            value={recruiting}
            onChange={(e) => setRecruiting(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All</option>
            <option value="true">Recruiting</option>
            <option value="false">Not recruiting</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState message={(error as Error).message} /> : null}
        {!isLoading && !isError && filtered.length === 0 ? <EmptyState /> : null}
        {filtered.map((lab) => (
          <LabCard key={lab.id} lab={lab} />
        ))}
      </div>
    </section>
  );
}
