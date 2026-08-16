"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Check, XCircle } from "lucide-react";

export interface ConsentBannerProps {
  isOpen: boolean;
  csrfToken: string;
  onConsentAccepted: () => void;
}

export function ConsentBanner({
  isOpen,
  csrfToken,
  onConsentAccepted,
}: ConsentBannerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          consentAcceptedAt: new Date().toISOString(),
          trackingEnabled: true,
        }),
      });
      onConsentAccepted();
    } catch (err) {
      console.error("Failed to accept consent:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      maxWidth="lg"
      title="Local Work Activity Tracker - Privacy & Consent"
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200 text-xs">
          <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
          <p>
            <strong>100% Localhost & Privacy-First</strong>: This application runs completely on your machine (<code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">127.0.0.1</code>) and persists data only to <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">data/db.json</code>. No cloud services, analytics, or external telemetry are used.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
              <Check className="h-4 w-4 text-emerald-600" />
              What Is Collected (Local Only)
            </h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>Active foreground application name</li>
              <li>Work session start, pause, and end times</li>
              <li>Idle duration (&gt; 5 minutes without input)</li>
              <li>Aggregate keypress and click counts (1-min buckets)</li>
              <li>Monitored folder file event metadata</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
            <h4 className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-1.5 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              What Is NEVER Collected
            </h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>No key identities, typed characters, or passwords</li>
              <li>No clipboard content or form data</li>
              <li>No screenshots or screen recordings</li>
              <li>No camera, microphone, or audio</li>
              <li>No file contents or network packets</li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          You can pause tracking at any time with one click, configure privacy settings (such as window title masking), export your data to JSON/CSV, or purge all records with automatic backup.
        </p>

        <div className="flex justify-end pt-2">
          <Button
            size="md"
            onClick={handleAccept}
            isLoading={isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Accept & Enable Local Tracking
          </Button>
        </div>
      </div>
    </Modal>
  );
}
