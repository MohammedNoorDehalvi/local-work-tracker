"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ApplicationUsageMetric } from "@/lib/types";
import { formatDuration } from "@/lib/date-utils";
import { AppWindow, Repeat } from "lucide-react";

export function AppUsageChart({ data }: { data: ApplicationUsageMetric[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Usage Breakdown</CardTitle>
          <CardDescription>Detailed time distribution across tools</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No application activity recorded in this date range.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Usage Breakdown</CardTitle>
        <CardDescription>Factual time distribution across active tools</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 8).map((app, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <AppWindow className="h-3.5 w-3.5 text-blue-500" />
                <span>{app.appName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" /> {app.switchCount}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDuration(app.durationSeconds)}
                </span>
                <span className="w-10 text-right font-mono">{app.percentage}%</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, app.percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
