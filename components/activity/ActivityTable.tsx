"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDuration, formatDisplayDateTime } from "@/lib/date-utils";
import { UnifiedActivityItem } from "@/app/api/activity/route";
import {
  AppWindow,
  FileCode,
  Keyboard,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export function ActivityTable({
  items,
  pagination,
  onPageChange,
  onFilterChange,
}: {
  items: UnifiedActivityItem[];
  pagination: { page: number; totalPages: number; total: number };
  onPageChange: (page: number) => void;
  onFilterChange: (type: string, search: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(typeFilter, searchTerm);
  };

  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    onFilterChange(newType, searchTerm);
  };

  const getTypeIcon = (type: UnifiedActivityItem["type"]) => {
    switch (type) {
      case "application":
        return <AppWindow className="h-4 w-4 text-blue-500" />;
      case "input":
        return <Keyboard className="h-4 w-4 text-sky-500" />;
      case "file":
        return <FileCode className="h-4 w-4 text-teal-500" />;
      case "idle":
        return <Coffee className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Recent Activity Log</CardTitle>
            <CardDescription>
              {pagination.total.toLocaleString()} total local events recorded
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search app or file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </form>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              {["all", "application", "file", "input", "idle"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                    typeFilter === t
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            No activity matches the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Activity Details</th>
                  <th className="pb-3 font-medium">Metadata / Window</th>
                  <th className="pb-3 font-medium text-right">Duration / Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                      {formatDisplayDateTime(item.timestamp)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {getTypeIcon(item.type)}
                        <span>{item.type}</span>
                      </div>
                    </td>
                    <td className="py-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.type === "application" && item.appName}
                      {item.type === "file" && `${item.fileName} (${item.fileEventType})`}
                      {item.type === "input" && "Input Activity Bucket"}
                      {item.type === "idle" && "User Inactivity Period"}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {item.type === "application" && (
                        <span>{item.windowTitle || "Window title masked"}</span>
                      )}
                      {item.type === "file" && (
                        <span className="font-mono text-[11px]">{item.fileExtension}</span>
                      )}
                      {item.type === "input" && (
                        <span>Aggregated 1-minute bucket</span>
                      )}
                      {item.type === "idle" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Idle
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {item.durationSeconds !== undefined && formatDuration(item.durationSeconds)}
                      {item.keyPressCount !== undefined && (
                        <span>
                          {item.keyPressCount} keys / {item.mouseClickCount} clicks
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="gap-1 h-8 px-2.5"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="gap-1 h-8 px-2.5"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
