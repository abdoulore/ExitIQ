import type { ExitGrade } from "@/lib/scoring";

type ScoreBadgeProps = {
  grade: ExitGrade;
  size?: "sm" | "md" | "lg";
};

export function ScoreBadge({ grade, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-bold ${sizeClass(
        size,
      )} ${toneClass(grade)}`}
    >
      {grade}
    </span>
  );
}

export function scoreTextClass(grade: ExitGrade) {
  if (grade === "A" || grade === "B") {
    return "text-[var(--success)]";
  }

  if (grade === "C" || grade === "D") {
    return "text-[var(--warning)]";
  }

  return "text-[var(--danger)]";
}

function sizeClass(size: ScoreBadgeProps["size"]) {
  if (size === "lg") {
    return "h-16 min-w-16 px-4 text-4xl";
  }

  if (size === "sm") {
    return "h-7 min-w-8 px-2 text-xs";
  }

  return "h-9 min-w-10 px-3 text-sm";
}

function toneClass(grade: ExitGrade) {
  if (grade === "A" || grade === "B") {
    return "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]";
  }

  if (grade === "C" || grade === "D") {
    return "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]";
  }

  return "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]";
}
