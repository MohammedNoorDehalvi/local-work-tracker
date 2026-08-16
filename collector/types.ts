import {
  CollectorCapabilities,
  CollectorEvent,
  CollectorConfigurationResponse,
  WorkSession,
} from "../lib/types";

export interface CollectorConfig {
  settingsRevision: number;
  sessionRevision: number;
  trackingEnabled: boolean;
  consentAcceptedAt: string | null;
  currentSession: WorkSession | null;
  pollingIntervalSeconds: number;
  idleThresholdSeconds: number;
  storeWindowTitles: boolean;
  storeFullFilePaths: boolean;
  monitoredFolders: string[];
  pathHashSalt: string;
}

export interface ActiveWindowSample {
  appName: string;
  executableName: string | null;
  windowTitle: string | null;
  idleSeconds: number;
  timestamp: string;
}

export type { CollectorCapabilities, CollectorEvent, CollectorConfigurationResponse };
