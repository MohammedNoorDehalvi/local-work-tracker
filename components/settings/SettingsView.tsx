"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Settings, StatusResponse } from "@/lib/types";
import {
  Shield,
  FolderPlus,
  Trash2,
  Download,
  Folder,
} from "lucide-react";

export function SettingsView({
  initialSettings,
  status: _status,
  csrfToken,
  onSettingsUpdated,
}: {
  initialSettings: Settings;
  status: StatusResponse | null;
  csrfToken: string;
  onSettingsUpdated: (updated: Settings) => void;
}) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [manualFolderPath, setManualFolderPath] = useState("");
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const saveSettingUpdate = async (updates: Partial<Settings>) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = (await res.json()) as Settings;
        setSettings(updated);
        onSettingsUpdated(updated);
        showToast("success", "Settings Saved", "Your tracking preferences have been updated.");
      } else {
        showToast("error", "Failed to save settings");
      }
    } catch {
      showToast("error", "Network error while saving settings");
    }
  };

  const handlePickFolder = async () => {
    setIsPickingFolder(true);
    try {
      const res = await fetch("/api/folders/pick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && !data.canceled && data.path) {
        if (!settings.monitoredFolders.includes(data.path)) {
          const newFolders = [...settings.monitoredFolders, data.path];
          await saveSettingUpdate({ monitoredFolders: newFolders });
          showToast("success", "Folder Added", `Monitoring: ${data.path}`);
        } else {
          showToast("info", "Folder Already Monitored");
        }
      } else if (!res.ok) {
        showToast("warning", "Folder Picker", data.error || "Please enter path manually.");
      }
    } catch {
      showToast("error", "Failed to launch folder picker");
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleAddManualFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualFolderPath.trim();
    if (!trimmed) return;

    if (!settings.monitoredFolders.includes(trimmed)) {
      const newFolders = [...settings.monitoredFolders, trimmed];
      await saveSettingUpdate({ monitoredFolders: newFolders });
      setManualFolderPath("");
      showToast("success", "Folder Added", `Monitoring: ${trimmed}`);
    }
  };

  const handleRemoveFolder = async (folderToRemove: string) => {
    const newFolders = settings.monitoredFolders.filter((f) => f !== folderToRemove);
    await saveSettingUpdate({ monitoredFolders: newFolders });
    showToast("info", "Folder Removed");
  };

  const handleDeleteData = async () => {
    if (deleteConfirmText !== "DELETE_ALL_DATA") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/data", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ confirmation: "DELETE_ALL_DATA", createBackup: true }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast("success", "Data Cleared", result.message);
        setIsDeleteModalOpen(false);
        setDeleteConfirmText("");
      } else {
        showToast("error", "Failed to delete data");
      }
    } catch {
      showToast("error", "Network error while clearing data");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. General Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Tracking Controls</CardTitle>
          <CardDescription>Configure local collection parameters and behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Activity Tracking
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Master switch for collecting active window, idle, and input counts
              </p>
            </div>
            <Switch
              checked={settings.trackingEnabled}
              onCheckedChange={(checked) => saveSettingUpdate({ trackingEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Active Window Polling Interval
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current: {settings.activeWindowPollingIntervalSeconds} seconds (Default: 5s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[3, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => saveSettingUpdate({ activeWindowPollingIntervalSeconds: sec })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    settings.activeWindowPollingIntervalSeconds === sec
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Idle Inactivity Threshold
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current: {Math.round(settings.idleThresholdSeconds / 60)} minutes without input
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "2m", val: 120 },
                { label: "5m", val: 300 },
                { label: "10m", val: 600 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => saveSettingUpdate({ idleThresholdSeconds: item.val })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    settings.idleThresholdSeconds === item.val
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Privacy & Data Masking */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <CardTitle>Privacy & Data Masking</CardTitle>
          </div>
          <CardDescription>
            Control how sensitive window titles and filesystem paths are handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Record Window Titles
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When disabled, window titles are masked at the OS query source (emits null)
              </p>
            </div>
            <Switch
              checked={settings.storeWindowTitles}
              onCheckedChange={(checked) => saveSettingUpdate({ storeWindowTitles: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Store Full File Paths
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When disabled, parent folders are anonymized with a salted local hash
              </p>
            </div>
            <Switch
              checked={settings.storeFullFilePaths}
              onCheckedChange={(checked) => saveSettingUpdate({ storeFullFilePaths: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Monitored Folders */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-teal-500" />
            <CardTitle>Monitored Folders</CardTitle>
          </div>
          <CardDescription>
            Select specific local directories to monitor file creation and modification events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={handlePickFolder}
              isLoading={isPickingFolder}
              className="gap-2 shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <FolderPlus className="h-4 w-4" />
              Browse Folder Dialog...
            </Button>

            <form onSubmit={handleAddManualFolder} className="flex-1 flex gap-2">
              <Input
                type="text"
                placeholder="Or enter absolute path: C:\Projects\MyProject"
                value={manualFolderPath}
                onChange={(e) => setManualFolderPath(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!manualFolderPath.trim()}>
                Add
              </Button>
            </form>
          </div>

          <div className="space-y-2 pt-2">
            {settings.monitoredFolders.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No folders currently monitored. Add folders to track project file modifications.
              </p>
            ) : (
              settings.monitoredFolders.map((folder, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
                >
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-md">
                    {folder}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFolder(folder)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Data Retention & Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention & Export</CardTitle>
          <CardDescription>Manage automated cleanup and export your tracking records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Retention Period
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically prune records older than: {settings.dataRetentionDays} days
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[14, 30, 60, 90, 180].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => saveSettingUpdate({ dataRetentionDays: days })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    settings.dataRetentionDays === days
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Export Local Data
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download your complete activity database in open formats
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/api/export?format=json" download>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </Button>
              </a>
              <a href="/api/export?format=csv" download>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Purge All Activity Data
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Creates an automatic timestamped backup in data/backups/ before resetting
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Data Purge"
        description="This action will clear all sessions, application activity, and file records from data/db.json. A backup file will be created automatically in data/backups/."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs">
            <p>
              To confirm deletion, type <strong>DELETE_ALL_DATA</strong> below:
            </p>
          </div>

          <Input
            type="text"
            placeholder="Type DELETE_ALL_DATA"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE_ALL_DATA"}
              isLoading={isDeleting}
              onClick={handleDeleteData}
            >
              Confirm Purge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
