"use client";

import React, { createContext, useContext, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : tab;

  const setActiveTab = (newTab: string) => {
    if (value === undefined) {
      setTab(newTab);
    }
    onValueChange?.(newTab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={twMerge(clsx("w-full", className))}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50",
          className
        )
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used inside Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => context.setActiveTab(value)}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
            : "hover:text-slate-900 dark:hover:text-slate-100",
          className
        )
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used inside Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div className={twMerge(clsx("mt-4 focus-visible:outline-none", className))}>
      {children}
    </div>
  );
}
