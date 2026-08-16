"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ApplicationUsageMetric } from "@/lib/types";
import { formatDuration } from "@/lib/date-utils";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#6366f1"];

export function TopAppsBarChart({ data }: { data: ApplicationUsageMetric[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Applications</CardTitle>
          <CardDescription>Most used tools by duration</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No application activity recorded in this date range.
        </CardContent>
      </Card>
    );
  }

  const topItems = data.slice(0, 6).map((app) => ({
    name: app.appName.length > 14 ? `${app.appName.slice(0, 12)}...` : app.appName,
    fullName: app.appName,
    durationMinutes: Number((app.durationSeconds / 60).toFixed(1)),
    rawSeconds: app.durationSeconds,
    percentage: app.percentage,
    switchCount: app.switchCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Applications</CardTitle>
        <CardDescription>Highest active usage duration</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topItems}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis type="number" unit="m" tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11 }}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.fullName}</p>
                      <p className="text-blue-600 dark:text-blue-400">
                        Duration: {formatDuration(item.rawSeconds)} ({item.percentage}%)
                      </p>
                      <p className="text-slate-400">
                        App switches: {item.switchCount}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="durationMinutes" radius={[0, 4, 4, 0]}>
              {topItems.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
