"use client";

// BEGINNER SAFE - teammate task area

export function LoadingState() {
  return <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Loading labs...</p>;
}

export function EmptyState() {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-700">
      No labs match your search yet.
    </p>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
      {message}
    </p>
  );
}
