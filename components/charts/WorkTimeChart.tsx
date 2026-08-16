"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DailyWorkTime } from "@/lib/types";
import { formatDuration } from "@/lib/date-utils";

export function WorkTimeChart({ data }: { data: DailyWorkTime[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Work Time</CardTitle>
          <CardDescription>Active vs idle duration by day</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No daily work activity recorded for this date range.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    activeHours: Number((d.activeSeconds / 3600).toFixed(2)),
    idleHours: Number((d.idleSeconds / 3600).toFixed(2)),
    rawActive: d.activeSeconds,
    rawIdle: d.idleSeconds,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Work Time</CardTitle>
        <CardDescription>Active work hours vs idle duration</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                      <p className="text-blue-600 dark:text-blue-400">
                        Active: {formatDuration(item.rawActive)} ({item.activeHours}h)
                      </p>
                      <p className="text-slate-400">
                        Idle: {formatDuration(item.rawIdle)} ({item.idleHours}h)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Bar dataKey="activeHours" name="Active Time (h)" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="idleHours" name="Idle Time (h)" fill="#94a3b8" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
