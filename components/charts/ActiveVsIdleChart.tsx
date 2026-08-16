"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { formatDuration } from "@/lib/date-utils";

export function ActiveVsIdleChart({
  activeSeconds,
  idleSeconds,
}: {
  activeSeconds: number;
  idleSeconds: number;
}) {
  const total = activeSeconds + idleSeconds;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active vs Idle Ratio</CardTitle>
          <CardDescription>Productive focus comparison</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No activity recorded to calculate ratio.
        </CardContent>
      </Card>
    );
  }

  const data = [
    { name: "Active Focus", value: activeSeconds, color: "#3b82f6" },
    { name: "Idle Time", value: idleSeconds, color: "#94a3b8" },
  ];

  const activePercent = Math.round((activeSeconds / total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active vs Idle Ratio</CardTitle>
        <CardDescription>{activePercent}% active focus percentage</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload;
                  const percent = Math.round((entry.value / total) * 100);
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                      <p style={{ color: entry.color }}>
                        {formatDuration(entry.value)} ({percent}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
