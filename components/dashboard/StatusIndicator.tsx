"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { StatusResponse, CollectorCapabilities } from "@/lib/types";
import { Activity, CheckCircle, AlertTriangle, Cpu } from "lucide-react";

export function StatusIndicator({ status }: { status: StatusResponse | null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!status) {
    return (
      <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Connecting...
      </Badge>
    );
  }

  const isConnected = status.collector.connected;
  const capabilities = status.collector.capabilities;

  const renderCapStatus = (name: string, cap: CollectorCapabilities[keyof CollectorCapabilities]) => {
    if (cap.available) {
      return (
        <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> Operational
          </span>
        </div>
      );
    }
    return (
      <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
        <div>
          <span className="font-medium text-slate-700 dark:text-slate-300 block">{name}</span>
          <span className="text-[11px] text-slate-400">{cap.reason}</span>
        </div>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium shrink-0">
          <AlertTriangle className="h-3.5 w-3.5" /> Degraded
        </span>
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 p-1.5 px-3 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <span>Collector: {isConnected ? "Active" : "Offline"}</span>
        <Cpu className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Collector System Diagnostics"
        description="Real-time health and capabilities of the background collection daemon."
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 block mb-1">Daemon Status</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {isConnected ? "Connected & Healthy" : "Disconnected / Heartbeat Stale"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 block mb-1">Database Size</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {status.databaseStats.databaseSizeKilobytes} KB ({status.databaseStats.totalActivityRecords} records)
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              Tracking Capabilities Status
            </h4>
            <div className="space-y-1.5">
              {renderCapStatus("Active Window Tracking", capabilities.activeWindow)}
              {renderCapStatus("Idle Duration Detection", capabilities.idleDetection)}
              {renderCapStatus("Keyboard Press Counting", capabilities.keyboardCount)}
              {renderCapStatus("Mouse Click Counting", capabilities.mouseCount)}
              {renderCapStatus("Monitored Folder Watcher", capabilities.fileMonitoring)}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
