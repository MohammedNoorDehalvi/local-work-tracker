import {
  DatabaseSchema,
  WorkSession,
  ApplicationActivity,
  InputActivityBucket,
  FileActivity,
  IdlePeriod,
} from "./types";
import { formatDuration } from "./date-utils";

/**
 * Escapes a cell value for RFC 4180 compliant CSV format
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects into CSV format with headers
 */
function arrayToCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

export function exportSessionsToCsv(sessions: WorkSession[]): string {
  const headers = [
    "Session ID",
    "Status",
    "Started At",
    "Ended At",
    "Active Duration (s)",
    "Active Duration Formatted",
    "Idle Duration (s)",
    "Idle Duration Formatted",
    "Created At",
  ];

  const rows = sessions.map((s) => [
    s.id,
    s.status,
    s.startedAt,
    s.endedAt || "",
    s.activeDurationSeconds,
    formatDuration(s.activeDurationSeconds),
    s.idleDurationSeconds,
    formatDuration(s.idleDurationSeconds),
    s.createdAt,
  ]);

  return arrayToCsv(headers, rows);
}

export function exportApplicationActivityToCsv(activities: ApplicationActivity[]): string {
  const headers = [
    "ID",
    "Session ID",
    "Application Name",
    "Executable Name",
    "Window Title",
    "Started At",
    "Ended At",
    "Duration (s)",
    "Duration Formatted",
    "Is Idle",
  ];

  const rows = activities.map((a) => [
    a.id,
    a.sessionId,
    a.appName,
    a.executableName || "",
    a.windowTitle || "",
    a.startedAt,
    a.endedAt,
    a.durationSeconds,
    formatDuration(a.durationSeconds),
    a.isIdle ? "Yes" : "No",
  ]);

  return arrayToCsv(headers, rows);
}

export function exportInputActivityToCsv(buckets: InputActivityBucket[]): string {
  const headers = [
    "ID",
    "Session ID",
    "Bucket Start",
    "Bucket End",
    "Key Press Count",
    "Mouse Click Count",
    "Mouse Move Distance",
  ];

  const rows = buckets.map((b) => [
    b.id,
    b.sessionId,
    b.bucketStart,
    b.bucketEnd,
    b.keyPressCount,
    b.mouseClickCount,
    b.mouseMoveDistance || 0,
  ]);

  return arrayToCsv(headers, rows);
}

export function exportFileActivityToCsv(files: FileActivity[]): string {
  const headers = [
    "ID",
    "Session ID",
    "File Name",
    "Extension",
    "Parent Directory",
    "Event Type",
    "Timestamp",
  ];

  const rows = files.map((f) => [
    f.id,
    f.sessionId,
    f.fileName,
    f.fileExtension,
    f.parentDirectory,
    f.eventType,
    f.timestamp,
  ]);

  return arrayToCsv(headers, rows);
}

export function exportIdlePeriodsToCsv(idles: IdlePeriod[]): string {
  const headers = [
    "ID",
    "Session ID",
    "Started At",
    "Ended At",
    "Duration (s)",
    "Duration Formatted",
  ];

  const rows = idles.map((i) => [
    i.id,
    i.sessionId,
    i.startedAt,
    i.endedAt,
    i.durationSeconds,
    formatDuration(i.durationSeconds),
  ]);

  return arrayToCsv(headers, rows);
}

export function exportCompleteDatabaseToJson(db: DatabaseSchema): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      metadata: db.metadata,
      settings: {
        ...db.settings,
        // Do not export secrets or internal salts
      },
      sessions: db.sessions,
      applicationActivity: db.applicationActivity,
      inputActivity: db.inputActivity,
      fileActivity: db.fileActivity,
      idlePeriods: db.idlePeriods,
    },
    null,
    2
  );
}

export function exportAllDataToCombinedCsv(db: DatabaseSchema): string {
  const sections = [
    "=== WORK SESSIONS ===",
    exportSessionsToCsv(db.sessions),
    "",
    "=== APPLICATION ACTIVITY ===",
    exportApplicationActivityToCsv(db.applicationActivity),
    "",
    "=== INPUT ACTIVITY (COUNTS ONLY) ===",
    exportInputActivityToCsv(db.inputActivity),
    "",
    "=== FILE ACTIVITY (METADATA ONLY) ===",
    exportFileActivityToCsv(db.fileActivity),
    "",
    "=== IDLE PERIODS ===",
    exportIdlePeriodsToCsv(db.idlePeriods),
  ];

  return sections.join("\r\n");
}
