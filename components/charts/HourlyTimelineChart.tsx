"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { HourlyActivityMetric } from "@/lib/types";
import { formatDuration } from "@/lib/date-utils";

export function HourlyTimelineChart({ data }: { data: HourlyActivityMetric[] }) {
  const hasData = data && data.some((d) => d.activeSeconds > 0 || d.idleSeconds > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hourly Productivity Timeline</CardTitle>
          <CardDescription>Activity density throughout the 24-hour day</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No hourly activity recorded for this date range.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    hour: `${d.hour.toString().padStart(2, "0")}:00`,
    activeMinutes: Number((d.activeSeconds / 60).toFixed(1)),
    idleMinutes: Number((d.idleSeconds / 60).toFixed(1)),
    rawActive: d.activeSeconds,
    rawIdle: d.idleSeconds,
    keyPressCount: d.keyPressCount,
    mouseClickCount: d.mouseClickCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Productivity Timeline</CardTitle>
        <CardDescription>Active work density throughout the 24-hour day</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} unit="m" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                      <p className="text-blue-600 dark:text-blue-400">
                        Active Time: {formatDuration(item.rawActive)} ({item.activeMinutes}m)
                      </p>
                      <p className="text-slate-400">
                        Idle Time: {formatDuration(item.rawIdle)} ({item.idleMinutes}m)
                      </p>
                      {item.keyPressCount > 0 && (
                        <p className="text-sky-500">Keystrokes: {item.keyPressCount}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Area
              type="monotone"
              dataKey="activeMinutes"
              name="Active (min)"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#activeGrad)"
            />
            <Area
              type="monotone"
              dataKey="idleMinutes"
              name="Idle (min)"
              stroke="#94a3b8"
              fillOpacity={1}
              fill="url(#idleGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
