"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { SessionControls } from "@/components/dashboard/SessionControls";
import { ConsentBanner } from "@/components/dashboard/ConsentBanner";
import { WorkTimeChart } from "@/components/charts/WorkTimeChart";
import { ActiveVsIdleChart } from "@/components/charts/ActiveVsIdleChart";
import { TopAppsBarChart } from "@/components/charts/TopAppsBarChart";
import { HourlyTimelineChart } from "@/components/charts/HourlyTimelineChart";
import { AppUsageChart } from "@/components/charts/AppUsageChart";
import { InputActivityChart } from "@/components/charts/InputActivityChart";
import { FileActivityChart } from "@/components/charts/FileActivityChart";
import { ActivityTable } from "@/components/activity/ActivityTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusResponse, AnalyticsResponse } from "@/lib/types";
import { UnifiedActivityItem } from "@/app/api/activity/route";
import { useToast } from "@/components/ui/Toast";
import { Play, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [activityItems, setActivityItems] = useState<UnifiedActivityItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedRange, setSelectedRange] = useState("today");
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({});
  const [activityFilter, setActivityFilter] = useState({ type: "all", search: "" });
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch CSRF token
  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((data) => {
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      })
      .catch((err) => console.error("CSRF fetch error:", err));
  }, []);

  // 2. Fetch Status
  const fetchStatus = useCallback(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch((err) => console.error("Status fetch error:", err));
  }, []);

  // 3. Fetch Analytics
  const fetchAnalytics = useCallback(() => {
    let url = `/api/analytics?range=${selectedRange}`;
    if (selectedRange === "custom" && customRange.from && customRange.to) {
      url += `&from=${encodeURIComponent(customRange.from)}&to=${encodeURIComponent(customRange.to)}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data: AnalyticsResponse) => {
        setAnalytics(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        setIsLoading(false);
      });
  }, [selectedRange, customRange]);

  // 4. Fetch Activity
  const fetchActivity = useCallback(
    (page = 1) => {
      let url = `/api/activity?page=${page}&limit=25&eventType=${activityFilter.type}`;
      if (activityFilter.search) {
        url += `&application=${encodeURIComponent(activityFilter.search)}`;
      }

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            setActivityItems(data.items);
            setPagination(data.pagination);
          }
        })
        .catch((err) => console.error("Activity fetch error:", err));
    },
    [activityFilter]
  );

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchAnalytics();
    fetchActivity(1);

    // Heartbeat poll every 5 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchAnalytics();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchAnalytics, fetchActivity]);

  const handleRangeChange = (preset: string, from?: string, to?: string) => {
    setSelectedRange(preset);
    if (preset === "custom" && from && to) {
      setCustomRange({ from, to });
    } else {
      setCustomRange({});
    }
  };

  const handleToggleTracking = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ trackingEnabled: enabled }),
      });

      if (res.ok) {
        showToast(
          "success",
          enabled ? "Tracking Enabled" : "Tracking Paused",
          enabled ? "Activity collector is active." : "Collector hooks are halted."
        );
        fetchStatus();
      }
    } catch {
      showToast("error", "Failed to update tracking status");
    }
  };

  const handleFilterChange = (type: string, search: string) => {
    setActivityFilter({ type, search });
  };

  const hasActivityData =
    analytics &&
    (analytics.summary.totalActiveDurationSeconds > 0 ||
      analytics.summary.totalIdleDurationSeconds > 0 ||
      activityItems.length > 0);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Navbar status={status} />

      {/* First-Run Privacy Consent Banner */}
      <ConsentBanner
        isOpen={status !== null && !status.consentAccepted}
        csrfToken={csrfToken}
        onConsentAccepted={() => {
          fetchStatus();
          fetchAnalytics();
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Work Activity Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authentic productivity analytics collected genuinely on your local machine
            </p>
          </div>

          <DateRangePicker
            currentPreset={selectedRange}
            onRangeChange={handleRangeChange}
          />
        </div>

        {/* Live Session Controls Bar */}
        <SessionControls
          currentSession={status?.currentSession || null}
          trackingEnabled={status?.trackingEnabled || false}
          csrfToken={csrfToken}
          onSessionChange={() => {
            fetchStatus();
            fetchAnalytics();
            fetchActivity(1);
          }}
          onToggleTracking={handleToggleTracking}
        />

        {/* Status Warning if Collector is Disconnected */}
        {status && !status.collector.connected && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Collector Offline</strong>: The background activity collector daemon is currently not reporting a heartbeat. Ensure the collector is running via <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">npm run dev</code>.
            </span>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && !analytics ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* 8 Summary Metric Cards */}
            {analytics && <SummaryCards summary={analytics.summary} />}

            {/* Zero Activity Empty State Notice */}
            {!hasActivityData && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Play className="h-6 w-6 ml-0.5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    No Activity Recorded Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    To start recording factual productivity data, click <strong>Start Session</strong> above and switch between your work applications. All tracking is stored safely in <code className="font-mono">data/db.json</code>.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Visual Analytics Charts Grid */}
            {analytics && (
              <>
                {/* Row 1: Daily Work Time & Active vs Idle Ratio */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <WorkTimeChart data={analytics.dailyTotals} />
                  </div>
                  <div>
                    <ActiveVsIdleChart
                      activeSeconds={analytics.summary.totalActiveDurationSeconds}
                      idleSeconds={analytics.summary.totalIdleDurationSeconds}
                    />
                  </div>
                </div>

                {/* Row 2: Top Apps Bar Chart & Hourly Productivity Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopAppsBarChart data={analytics.topApplications} />
                  <HourlyTimelineChart data={analytics.hourlyDistribution} />
                </div>

                {/* Row 3: Application Breakdown Details & Input Frequency */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AppUsageChart data={analytics.topApplications} />
                  <InputActivityChart data={analytics.inputTrends} />
                </div>

                {/* Row 4: Monitored Folder File Activity */}
                <FileActivityChart
                  byExtension={analytics.fileMetrics.byExtension}
                  byEventType={analytics.fileMetrics.byEventType}
                  totalEvents={analytics.fileMetrics.totalEvents}
                />
              </>
            )}

            {/* Activity Table */}
            <ActivityTable
              items={activityItems}
              pagination={pagination}
              onPageChange={(page) => fetchActivity(page)}
              onFilterChange={handleFilterChange}
            />
          </>
        )}
      </main>
    </div>
  );
}
