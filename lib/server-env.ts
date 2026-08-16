if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import path from "path";

export const APP_VERSION = "1.0.0";
export const DATABASE_PATH = path.resolve(process.cwd(), process.env.DATABASE_PATH || "data/db.json");
export const BACKUP_DIR = path.resolve(process.cwd(), "data/backups");
export const COLLECTOR_TOKEN_PATH = path.resolve(process.cwd(), ".collector-token");
export const PATH_SALT_PATH = path.resolve(process.cwd(), ".path-salt");
export const DB_LOCK_PATH = path.resolve(process.cwd(), "data/db.lock");
export const COLLECTOR_LOCK_PATH = path.resolve(process.cwd(), "data/collector.lock");
export const PENDING_EVENTS_PATH = path.resolve(process.cwd(), "data/pending-events.ndjson");
export const REJECTED_EVENTS_PATH = path.resolve(process.cwd(), "data/rejected-events.ndjson");

export const INGESTION_LIMITS = {
  maximumBodyBytes: 1_000_000,
  maximumEventsPerBatch: 2_000,
  maximumWindowTitleLength: 512,
  maximumFileNameLength: 255,
  maximumPathLength: 32_767,
  maximumAppNameLength: 128,
  maximumFutureTimestampSkewMs: 60_000,
} as const;

export const DB_LIMITS = {
  maximumBackups: 10,
  maxDbSizeWarningBytes: 50 * 1024 * 1024, // 50MB warning threshold
  maxProcessedBatchLedgerAgeDays: 7,
} as const;

import { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  trackingEnabled: false,
  consentAcceptedAt: null,
  activeWindowPollingIntervalSeconds: 5,
  idleThresholdSeconds: 300,
  storeWindowTitles: false,
  storeFullFilePaths: false,
  monitoredFolders: [],
  dataRetentionDays: 30,
  automaticSessionStart: false,
  settingsRevision: 1,
};
