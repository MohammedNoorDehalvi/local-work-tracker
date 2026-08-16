import { z } from "zod";
import { INGESTION_LIMITS } from "./server-env";

// Helper to strip dangerous control characters and trim string
const sanitizeString = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
    .transform((val) =>
      val
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim()
    );

export const capabilityStatusSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
  }),
  z.object({
    available: z.literal(false),
    reason: z.string().max(256),
    recoverable: z.boolean(),
  }),
]);

export const collectorCapabilitiesSchema = z.object({
  activeWindow: capabilityStatusSchema,
  idleDetection: capabilityStatusSchema,
  keyboardCount: capabilityStatusSchema,
  mouseCount: capabilityStatusSchema,
  fileMonitoring: capabilityStatusSchema,
});

export const applicationActivitySchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  appName: sanitizeString(INGESTION_LIMITS.maximumAppNameLength).refine((s) => s.length > 0, {
    message: "Application name cannot be empty",
  }),
  executableName: sanitizeString(INGESTION_LIMITS.maximumAppNameLength).nullable(),
  windowTitle: sanitizeString(INGESTION_LIMITS.maximumWindowTitleLength).nullable(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().min(0),
  isIdle: z.boolean(),
}).refine(
  (data) => new Date(data.endedAt).getTime() >= new Date(data.startedAt).getTime(),
  {
    message: "Application activity endedAt cannot be before startedAt",
  }
);

export const inputActivityBucketSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  bucketStart: z.string().datetime(),
  bucketEnd: z.string().datetime(),
  keyPressCount: z.number().int().min(0),
  mouseClickCount: z.number().int().min(0),
  mouseMoveDistance: z.number().min(0).optional(),
}).refine(
  (data) => new Date(data.bucketEnd).getTime() >= new Date(data.bucketStart).getTime(),
  {
    message: "Input bucket end time cannot be before start time",
  }
);

export const fileActivitySchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  fileName: sanitizeString(INGESTION_LIMITS.maximumFileNameLength).refine((s) => s.length > 0, {
    message: "File name cannot be empty",
  }),
  fileExtension: sanitizeString(32),
  parentDirectory: sanitizeString(INGESTION_LIMITS.maximumPathLength),
  eventType: z.enum(["create", "modify", "rename", "delete"]),
  timestamp: z.string().datetime(),
});

export const idlePeriodSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().min(0),
}).refine(
  (data) => new Date(data.endedAt).getTime() >= new Date(data.startedAt).getTime(),
  {
    message: "Idle period endedAt cannot be before startedAt",
  }
);

export const workSessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  activeDurationSeconds: z.number().min(0),
  idleDurationSeconds: z.number().min(0),
  status: z.enum(["active", "paused", "completed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const collectorEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("application"),
    payload: applicationActivitySchema,
  }),
  z.object({
    type: z.literal("input"),
    payload: inputActivityBucketSchema,
  }),
  z.object({
    type: z.literal("file"),
    payload: fileActivitySchema,
  }),
  z.object({
    type: z.literal("idle"),
    payload: idlePeriodSchema,
  }),
]);

export const ingestBatchSchema = z.object({
  schemaVersion: z.literal(1),
  batchId: z.string().uuid(),
  collectorInstanceId: z.string().uuid(),
  createdAt: z.string().datetime(),
  sequenceNumber: z.number().int().min(0),
  events: z.array(collectorEventSchema).max(INGESTION_LIMITS.maximumEventsPerBatch),
  capabilities: collectorCapabilitiesSchema,
}).refine(
  (data) => {
    const batchTime = new Date(data.createdAt).getTime();
    const now = Date.now();
    return batchTime <= now + INGESTION_LIMITS.maximumFutureTimestampSkewMs;
  },
  {
    message: "Batch creation timestamp is unreasonably in the future",
  }
);

export const updateSettingsSchema = z.object({
  trackingEnabled: z.boolean().optional(),
  consentAcceptedAt: z.string().datetime().nullable().optional(),
  activeWindowPollingIntervalSeconds: z.number().int().min(1).max(60).optional(),
  idleThresholdSeconds: z.number().int().min(30).max(3600).optional(),
  storeWindowTitles: z.boolean().optional(),
  storeFullFilePaths: z.boolean().optional(),
  monitoredFolders: z.array(z.string().max(INGESTION_LIMITS.maximumPathLength)).max(50).optional(),
  dataRetentionDays: z.number().int().min(1).max(365).optional(),
  automaticSessionStart: z.boolean().optional(),
});

export const sessionActionSchema = z.object({
  action: z.enum(["start", "pause", "resume", "end"]),
  sessionId: z.string().uuid().optional(),
});

export const deleteDataSchema = z.object({
  confirmation: z.literal("DELETE_ALL_DATA"),
  createBackup: z.boolean().default(true),
});

export const activityQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  application: z.string().optional(),
  eventType: z.enum(["all", "application", "input", "file", "idle"]).default("all"),
  sessionId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const analyticsQuerySchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "30d", "custom"]).default("today"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
