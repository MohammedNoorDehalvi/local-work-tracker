"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDuration } from "@/lib/date-utils";
import { AnalyticsSummary } from "@/lib/types";
import {
  Clock,
  Coffee,
  Briefcase,
  Layers,
  Repeat,
  FileCode2,
  Keyboard,
  MousePointer2,
} from "lucide-react";

export function SummaryCards({ summary }: { summary: AnalyticsSummary }) {
  const cards = [
    {
      title: "Active Work Time",
      value: formatDuration(summary.totalActiveDurationSeconds),
      subtext: `${summary.productivePercentage}% of total recorded time`,
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      highlight: true,
    },
    {
      title: "Idle Duration",
      value: formatDuration(summary.totalIdleDurationSeconds),
      subtext: "Inactive periods (> 5 min threshold)",
      icon: <Coffee className="h-5 w-5 text-amber-500" />,
    },
    {
      title: "Work Sessions",
      value: summary.sessionCount.toString(),
      subtext: `Avg: ${formatDuration(summary.averageSessionDurationSeconds)} / Longest: ${formatDuration(summary.longestSessionDurationSeconds)}`,
      icon: <Briefcase className="h-5 w-5 text-emerald-500" />,
    },
    {
      title: "Top Application",
      value: summary.mostUsedApplication || "None recorded",
      subtext: summary.mostUsedApplication ? "Most focused application" : "Start a session to record",
      icon: <Layers className="h-5 w-5 text-indigo-500" />,
    },
    {
      title: "App Switches",
      value: summary.totalApplicationSwitches.toLocaleString(),
      subtext: "Context switches between apps",
      icon: <Repeat className="h-5 w-5 text-purple-500" />,
    },
    {
      title: "Tracked File Events",
      value: summary.totalFileEvents.toLocaleString(),
      subtext: "Created, modified, or deleted files",
      icon: <FileCode2 className="h-5 w-5 text-teal-500" />,
    },
    {
      title: "Total Keystrokes",
      value: summary.totalKeyPressCount.toLocaleString(),
      subtext: "Aggregate counts only (privacy safe)",
      icon: <Keyboard className="h-5 w-5 text-sky-500" />,
    },
    {
      title: "Mouse Clicks",
      value: summary.totalMouseClickCount.toLocaleString(),
      subtext: "Total aggregate clicks recorded",
      icon: <MousePointer2 className="h-5 w-5 text-pink-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className={
            card.highlight
              ? "border-blue-500/30 dark:border-blue-500/20 bg-linear-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900"
              : ""
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {card.value}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {card.subtext}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
