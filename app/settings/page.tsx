"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { SettingsView } from "@/components/settings/SettingsView";
import { Skeleton } from "@/components/ui/Skeleton";
import { Settings, StatusResponse } from "@/lib/types";

export default function SettingsPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. CSRF
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((data) => {
        if (data.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch((err) => console.error("CSRF error:", err));

    // 2. Settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Settings error:", err);
        setIsLoading(false);
      });

    // 3. Status
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch((err) => console.error("Status error:", err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Navbar status={status} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tracker Settings & Privacy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage local collection parameters, folder watchers, and data retention
          </p>
        </div>

        {isLoading || !settings ? (
          <div className="space-y-6 max-w-4xl">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : (
          <SettingsView
            initialSettings={settings}
            status={status}
            csrfToken={csrfToken}
            onSettingsUpdated={(updated) => setSettings(updated)}
          />
        )}
      </main>
    </div>
  );
}
