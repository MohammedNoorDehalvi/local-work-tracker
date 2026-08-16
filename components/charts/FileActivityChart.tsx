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
import { FileExtensionMetric, FileEventMetric } from "@/lib/types";

const EXT_COLORS = ["#0d9488", "#0284c7", "#8b5cf6", "#f59e0b", "#10b981", "#64748b"];

export function FileActivityChart({
  byExtension,
  byEventType,
  totalEvents,
}: {
  byExtension: FileExtensionMetric[];
  byEventType: FileEventMetric[];
  totalEvents: number;
}) {
  if (totalEvents === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Activity by Extension</CardTitle>
          <CardDescription>Modifications in monitored folders</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-xs text-slate-400">
          No file activity recorded in monitored folders.
        </CardContent>
      </Card>
    );
  }

  const topExtensions = byExtension.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>File Activity by Extension</CardTitle>
            <CardDescription>{totalEvents} file events detected</CardDescription>
          </div>
          <div className="flex gap-2">
            {byEventType.map((t) => (
              <span
                key={t.eventType}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize"
              >
                {t.eventType}: {t.count}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topExtensions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="extension" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                      <p className="text-teal-600 dark:text-teal-400">
                        Modifications: {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {topExtensions.map((_, index) => (
                <Cell key={`cell-${index}`} fill={EXT_COLORS[index % EXT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
