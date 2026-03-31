"use client";

// BEGINNER SAFE - teammate task area

type BadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-800 border-slate-300",
  success: "bg-emerald-100 text-emerald-800 border-emerald-300",
  warning: "bg-amber-100 text-amber-900 border-amber-300",
};

export function StatusBadge({ label, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
