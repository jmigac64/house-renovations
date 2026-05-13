"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#0f766e", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#6366f1"];

export function CategoryPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-72 w-full rounded-2xl border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={95} innerRadius={45}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => Number(value ?? 0).toFixed(2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingLineChart({ data }: { data: Array<{ month: string; value: number }> }) {
  return (
    <div className="h-72 w-full rounded-2xl border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => Number(value ?? 0).toFixed(2)} />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GenericBarChart({
  data,
  xKey,
  yKey,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}) {
  return (
    <div className="h-72 w-full rounded-2xl border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip formatter={(value) => Number(value ?? 0).toFixed(2)} />
          <Bar dataKey={yKey} fill="#0f766e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
