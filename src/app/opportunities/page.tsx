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
  const [department, setDepartment] = useState("all");
  const [recruiting, setRecruiting] = useState("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["opportunities"],
    queryFn: fetchLabs,
  });

  const departments = useMemo(() => {
    const values = new Set((data ?? []).map((item) => item.department));
    return ["all", ...Array.from(values).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((item) => {
      const matchesSearch =
        !search ||
        item.labName.toLowerCase().includes(search.toLowerCase()) ||
        (item.researchArea ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesDept = department === "all" || item.department === department;
      const matchesRecruiting =
        recruiting === "all" ||
        String(item.recruitingUndergrads) === recruiting;

      return matchesSearch && matchesDept && matchesRecruiting;
    });
  }, [data, department, recruiting, search]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Research opportunities</h1>
      <p className="mt-2 text-sm text-slate-700">
        Search by lab name or topic, then filter by department and recruiting status.
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lab name or topic"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={recruiting}
          onChange={(e) => setRecruiting(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">all</option>
          <option value="true">recruiting</option>
          <option value="false">not recruiting</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
