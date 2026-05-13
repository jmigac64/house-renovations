import { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
};

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "border-slate-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  danger: "border-rose-200",
  info: "border-sky-200",
};

export function MetricCard({ label, value, helper, tone = "neutral", icon }: MetricCardProps) {
  return (
    <article className={cn("rounded-2xl border bg-white p-5 shadow-sm", toneClass[tone])}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </article>
  );
}
