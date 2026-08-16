export type SessionStatus = "active" | "paused" | "completed";

export interface WorkSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  activeDurationSeconds: number;
  idleDurationSeconds: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationActivity {
  id: string;
  sessionId: string;
  appName: string;
  executableName: string | null;
  windowTitle: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  isIdle: boolean;
}

export interface InputActivityBucket {
  id: string;
  sessionId: string;
  bucketStart: string;
  bucketEnd: string;
  keyPressCount: number;
  mouseClickCount: number;
  mouseMoveDistance?: number;
}

export type FileEventType = "create" | "modify" | "rename" | "delete";

export interface FileActivity {
  id: string;
  sessionId: string;
  fileName: string;
  fileExtension: string;
  parentDirectory: string;
  eventType: FileEventType;
  timestamp: string;
}

export interface IdlePeriod {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

export interface Settings {
  trackingEnabled: boolean;
  consentAcceptedAt: string | null;
  activeWindowPollingIntervalSeconds: number;
  idleThresholdSeconds: number;
  storeWindowTitles: boolean;
  storeFullFilePaths: boolean;
  monitoredFolders: string[];
  dataRetentionDays: number;
  automaticSessionStart: boolean;
  settingsRevision: number;
}

export type CapabilityStatus =
  | { available: true }
  | { available: false; reason: string; recoverable: boolean };

export interface CollectorCapabilities {
  activeWindow: CapabilityStatus;
  idleDetection: CapabilityStatus;
  keyboardCount: CapabilityStatus;
  mouseCount: CapabilityStatus;
  fileMonitoring: CapabilityStatus;
}

export interface CollectorStatus {
  running: boolean;
  processId: number | null;
  instanceId: string | null;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  capabilities: CollectorCapabilities;
}

export interface ProcessedBatchRecord {
  batchId: string;
  collectorInstanceId: string;
  processedAt: string;
}

export interface DatabaseMetadata {
  version: number;
  createdAt: string;
  updatedAt: string;
  lastRetentionCleanupAt: string | null;
}

export interface DatabaseSchema {
  metadata: DatabaseMetadata;
  settings: Settings;
  collectorStatus: CollectorStatus;
  sessions: WorkSession[];
  applicationActivity: ApplicationActivity[];
  inputActivity: InputActivityBucket[];
  fileActivity: FileActivity[];
  idlePeriods: IdlePeriod[];
  processedBatches: ProcessedBatchRecord[];
}

export type CollectorEvent =
  | {
      type: "application";
      payload: ApplicationActivity;
    }
  | {
      type: "input";
      payload: InputActivityBucket;
    }
  | {
      type: "file";
      payload: FileActivity;
    }
  | {
      type: "idle";
      payload: IdlePeriod;
    };

export interface IngestBatchPayload {
  schemaVersion: 1;
  batchId: string;
  collectorInstanceId: string;
  createdAt: string;
  sequenceNumber: number;
  events: CollectorEvent[];
  capabilities: CollectorCapabilities;
}

export interface IngestResponse {
  accepted: true;
  batchId: string;
  duplicate: boolean;
  acceptedEventCount: number;
  serverReceivedAt: string;
  settingsRevision: number;
  sessionRevision: number;
}

export type IngestRejectionCode =
  | "INVALID_SCHEMA"
  | "INVALID_TIMESTAMP"
  | "PAYLOAD_TOO_LARGE"
  | "SESSION_CLOSED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED";

export interface IngestRejectionResponse {
  accepted: false;
  retryable: boolean;
  code: IngestRejectionCode;
  message: string;
}

export interface CollectorConfigurationResponse {
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

export interface DailyWorkTime {
  date: string;
  activeSeconds: number;
  idleSeconds: number;
  sessionCount: number;
}

export interface ApplicationUsageMetric {
  appName: string;
  durationSeconds: number;
  percentage: number;
  switchCount: number;
}

export interface HourlyActivityMetric {
  hour: number;
  activeSeconds: number;
  idleSeconds: number;
  keyPressCount: number;
  mouseClickCount: number;
  fileEventsCount: number;
}

export interface FileExtensionMetric {
  extension: string;
  count: number;
}

export interface FileEventMetric {
  eventType: FileEventType;
  count: number;
}

export interface AnalyticsSummary {
  totalActiveDurationSeconds: number;
  totalIdleDurationSeconds: number;
  totalDurationSeconds: number;
  productivePercentage: number;
  sessionCount: number;
  averageSessionDurationSeconds: number;
  longestSessionDurationSeconds: number;
  mostUsedApplication: string | null;
  totalApplicationSwitches: number;
  totalFileEvents: number;
  totalKeyPressCount: number;
  totalMouseClickCount: number;
  mostActiveDay: string | null;
  mostActiveHour: number | null;
  activeDaysCount: number;
  currentStreakDays: number;
}

export interface AnalyticsResponse {
  dateRange: {
    from: string;
    to: string;
    preset: string;
  };
  summary: AnalyticsSummary;
  dailyTotals: DailyWorkTime[];
  topApplications: ApplicationUsageMetric[];
  hourlyDistribution: HourlyActivityMetric[];
  inputTrends: Array<{
    timestamp: string;
    keyPressCount: number;
    mouseClickCount: number;
  }>;
  fileMetrics: {
    byExtension: FileExtensionMetric[];
    byEventType: FileEventMetric[];
    totalEvents: number;
  };
}

export interface StatusResponse {
  server: {
    status: "ok";
    uptimeSeconds: number;
    version: string;
  };
  collector: {
    connected: boolean;
    running: boolean;
    processId: number | null;
    lastHeartbeatAt: string | null;
    lastEventAt: string | null;
    lastError: string | null;
    capabilities: CollectorCapabilities;
  };
  trackingEnabled: boolean;
  consentAccepted: boolean;
  currentSession: WorkSession | null;
  databaseStats: {
    totalSessions: number;
    totalActivityRecords: number;
    totalFileRecords: number;
    totalInputBuckets: number;
    databaseSizeKilobytes: number;
  };
}
