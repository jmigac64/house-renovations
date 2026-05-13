import Link from "next/link";
import { PageHeader } from "@/src/components/page-header";

const reports = [
  { href: "/reports/planned-vs-actual", title: "Planned vs Actual", desc: "Compare budget lines to actual expenses." },
  { href: "/reports/category-spending", title: "Category Spending", desc: "Understand where money is going by category." },
  { href: "/reports/vendor-spending", title: "Vendor Spending", desc: "Review contractor and supplier costs." },
  { href: "/reports/monthly-cash-flow", title: "Monthly Cash Flow", desc: "Track incoming and outgoing cash over time." },
  { href: "/reports/forecast", title: "Forecast", desc: "Estimate final renovation cost and funding gap." },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Financial reporting and renovation forecasting." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-sky-300">
            <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{report.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
