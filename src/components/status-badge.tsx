import { cn } from "@/src/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const toneClass: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", toneClass[tone])}>{label}</span>;
}
