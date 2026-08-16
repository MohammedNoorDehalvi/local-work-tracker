"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { WorkSession } from "@/lib/types";
import { formatDurationDigital } from "@/lib/date-utils";
import { Play, Pause, Square, Power, Radio } from "lucide-react";

export interface SessionControlsProps {
  currentSession: WorkSession | null;
  trackingEnabled: boolean;
  csrfToken: string;
  onSessionChange: () => void;
  onToggleTracking: (enabled: boolean) => void;
}

export function SessionControls({
  currentSession,
  trackingEnabled,
  csrfToken,
  onSessionChange,
  onToggleTracking,
}: SessionControlsProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(
    currentSession ? currentSession.activeDurationSeconds : 0
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentSession || currentSession.status !== "active") {
      if (currentSession) {
        setElapsedSeconds(currentSession.activeDurationSeconds);
      } else {
        setElapsedSeconds(0);
      }
      return;
    }

    setElapsedSeconds(currentSession.activeDurationSeconds);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  const handleAction = async (action: "start" | "pause" | "resume" | "end") => {
    setIsLoading(true);
    try {
      if (action === "start") {
        await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ action: "start" }),
        });
      } else {
        await fetch("/api/sessions", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ action, sessionId: currentSession?.id }),
        });
      }
      onSessionChange();
    } catch (err) {
      console.error("Session action error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!trackingEnabled) {
      return (
        <Badge variant="destructive" className="gap-1.5 py-1 px-3">
          <Power className="h-3 w-3" />
          Tracking Disabled
        </Badge>
      );
    }

    if (!currentSession || currentSession.status === "completed") {
      return (
        <Badge variant="secondary" className="gap-1.5 py-1 px-3">
          <Radio className="h-3 w-3 text-slate-400" />
          No Active Session
        </Badge>
      );
    }

    if (currentSession.status === "paused") {
      return (
        <Badge variant="warning" className="gap-1.5 py-1 px-3">
          <Pause className="h-3 w-3" />
          Session Paused
        </Badge>
      );
    }

    return (
      <Badge variant="success" className="gap-1.5 py-1 px-3 animate-pulse">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Session Active
      </Badge>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
      <div className="flex items-center gap-4">
        {getStatusBadge()}
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Active Duration:
          </span>
          <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatDurationDigital(elapsedSeconds)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(!currentSession || currentSession.status === "completed") && (
          <Button
            size="sm"
            onClick={() => handleAction("start")}
            isLoading={isLoading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="h-4 w-4" />
            Start Session
          </Button>
        )}

        {currentSession && currentSession.status === "active" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("pause")}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("end")}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <Square className="h-4 w-4" />
              End Session
            </Button>
          </>
        )}

        {currentSession && currentSession.status === "paused" && (
          <>
            <Button
              size="sm"
              onClick={() => handleAction("resume")}
              isLoading={isLoading}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleAction("end")}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <Square className="h-4 w-4" />
              End Session
            </Button>
          </>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <Button
          size="sm"
          variant={trackingEnabled ? "outline" : "default"}
          onClick={() => onToggleTracking(!trackingEnabled)}
          className="gap-1.5 text-xs"
        >
          <Power className="h-3.5 w-3.5" />
          {trackingEnabled ? "Pause Tracking" : "Enable Tracking"}
        </Button>
      </div>
    </div>
  );
}
