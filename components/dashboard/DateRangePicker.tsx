"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Calendar } from "lucide-react";

export interface DateRangePickerProps {
  currentPreset: string;
  onRangeChange: (preset: string, customFrom?: string, customTo?: string) => void;
}

export function DateRangePicker({
  currentPreset,
  onRangeChange,
}: DateRangePickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const presets = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
  ];

  const handleApplyCustom = () => {
    if (fromInput && toInput) {
      onRangeChange("custom", new Date(fromInput).toISOString(), new Date(toInput).toISOString());
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onRangeChange(preset.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            currentPreset === preset.id
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          {preset.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
          currentPreset === "custom"
            ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>Custom</span>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Custom Date Range"
        description="Choose start and end dates to filter your local activity."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!fromInput || !toInput}
              onClick={handleApplyCustom}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
