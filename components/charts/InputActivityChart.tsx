"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export interface InputTrendItem {
  timestamp: string;
  keyPressCount: number;
  mouseClickCount: number;
}

export function InputActivityChart({ data }: { data: InputTrendItem[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyboard & Mouse Activity</CardTitle>
          <CardDescription>Aggregate input frequencies over time (counts only)</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No input activity recorded for this period.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(-40).map((d) => ({
    time: d.timestamp.slice(11, 16), // HH:MM
    fullTime: d.timestamp,
    keyPressCount: d.keyPressCount,
    mouseClickCount: d.mouseClickCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyboard & Mouse Activity</CardTitle>
        <CardDescription>Aggregate event frequency (privacy safe, counts only)</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                      <p className="text-sky-500">Keystrokes: {item.keyPressCount}</p>
                      <p className="text-pink-500">Mouse Clicks: {item.mouseClickCount}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Line
              type="monotone"
              dataKey="keyPressCount"
              name="Keystrokes"
              stroke="#0284c7"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="mouseClickCount"
              name="Mouse Clicks"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
