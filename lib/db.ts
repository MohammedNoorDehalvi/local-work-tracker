if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  DATABASE_PATH,
  BACKUP_DIR,
  DB_LOCK_PATH,
  DB_LIMITS,
  DEFAULT_SETTINGS,
} from "./server-env";
import { DatabaseSchema, Settings } from "./types";
import { subDays, parseISO } from "date-fns";

let inProcessQueue: Promise<unknown> = Promise.resolve();

export class LockTimeoutError extends Error {
  constructor(message = "Could not acquire database file lock within timeout") {
    super(message);
    this.name = "LockTimeoutError";
  }
}

export class CorruptedDatabaseError extends Error {
  constructor(message = "Database file is corrupted and unparseable") {
    super(message);
    this.name = "CorruptedDatabaseError";
  }
}

export function createDefaultDatabase(overrides?: Partial<Settings>): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    metadata: {
      version: 1,
      createdAt: now,
      updatedAt: now,
      lastRetentionCleanupAt: null,
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...overrides,
    },
    collectorStatus: {
      running: false,
      processId: null,
      instanceId: null,
      startedAt: null,
      lastHeartbeatAt: null,
      lastEventAt: null,
      lastError: null,
      capabilities: {
        activeWindow: { available: false, reason: "Collector not started", recoverable: true },
        idleDetection: { available: false, reason: "Collector not started", recoverable: true },
        keyboardCount: { available: false, reason: "Collector not started", recoverable: true },
        mouseCount: { available: false, reason: "Collector not started", recoverable: true },
        fileMonitoring: { available: false, reason: "Collector not started", recoverable: true },
      },
    },
    sessions: [],
    applicationActivity: [],
    inputActivity: [],
    fileActivity: [],
    idlePeriods: [],
    processedBatches: [],
  };
}

async function acquireFileLock(
  lockPath: string = DB_LOCK_PATH,
  timeoutMs: number = 10000,
  pollIntervalMs: number = 50
): Promise<() => void> {
  const startTime = Date.now();
  const lockPayload = JSON.stringify({
    pid: process.pid,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
  });

  while (Date.now() - startTime < timeoutMs) {
    try {
      fs.writeFileSync(lockPath, lockPayload, { flag: "wx" });
      
      return () => {
        try {
          if (fs.existsSync(lockPath)) {
            const content = fs.readFileSync(lockPath, "utf-8");
            const parsed = JSON.parse(content);
            if (parsed.pid === process.pid) {
              fs.unlinkSync(lockPath);
            }
          }
        } catch {
          // Ignore unlink cleanup errors
        }
      };
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === "EEXIST") {
        try {
          const content = fs.readFileSync(lockPath, "utf-8");
          const parsed = JSON.parse(content);
          const lockAgeMs = Date.now() - new Date(parsed.createdAt).getTime();

          let isProcessAlive = false;
          if (parsed.pid) {
            try {
              process.kill(parsed.pid, 0);
              isProcessAlive = true;
            } catch {
              isProcessAlive = false;
            }
          }

          if (!isProcessAlive || lockAgeMs > 30000) {
            try {
              fs.unlinkSync(lockPath);
              continue;
            } catch {
              // Ignore
            }
          }
        } catch {
          try {
            fs.unlinkSync(lockPath);
            continue;
          } catch {
            // Ignore
          }
        }

        await new Promise((r) => setTimeout(r, pollIntervalMs));
      } else {
        throw err;
      }
    }
  }

  throw new LockTimeoutError(`Failed to acquire DB lock (${lockPath}) after ${timeoutMs}ms`);
}

export function getDatabaseReadOnly(): DatabaseSchema {
  if (!fs.existsSync(DATABASE_PATH)) {
    return createDefaultDatabase();
  }

  try {
    const raw = fs.readFileSync(DATABASE_PATH, "utf-8").trim();
    if (!raw || raw === "{}") {
      return createDefaultDatabase();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.metadata || !parsed.settings) {
      return createDefaultDatabase(parsed?.settings);
    }
    return parsed as DatabaseSchema;
  } catch (err) {
    console.error("Failed to parse database file:", err);
    return createDefaultDatabase();
  }
}

export function createDatabaseBackup(reason = "manual"): string | null {
  if (!fs.existsSync(DATABASE_PATH)) {
    return null;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `db-backup-${reason}-${timestamp}.json`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  fs.copyFileSync(DATABASE_PATH, backupFilePath);

  try {
    const backupFiles = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("db-backup-") && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        fullPath: path.join(BACKUP_DIR, f),
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backupFiles.length > DB_LIMITS.maximumBackups) {
      for (const excess of backupFiles.slice(DB_LIMITS.maximumBackups)) {
        try {
          fs.unlinkSync(excess.fullPath);
        } catch {
          // Ignore unlink errors
        }
      }
    }
  } catch (e) {
    console.error("Backup rotation error:", e);
  }

  return backupFilePath;
}

function applyRetentionCleanup(db: DatabaseSchema): boolean {
  const retentionDays = db.settings.dataRetentionDays;
  if (!retentionDays || retentionDays <= 0) return false;

  const now = new Date();
  const lastCleanup = db.metadata.lastRetentionCleanupAt
    ? new Date(db.metadata.lastRetentionCleanupAt).getTime()
    : 0;

  if (now.getTime() - lastCleanup < 24 * 60 * 60 * 1000) {
    return false;
  }

  const cutoff = subDays(now, retentionDays);
  const cutoffTime = cutoff.getTime();
  const processedBatchCutoffTime = subDays(now, DB_LIMITS.maxProcessedBatchLedgerAgeDays).getTime();

  let modified = false;

  const appCountBefore = db.applicationActivity.length;
  db.applicationActivity = db.applicationActivity.filter(
    (a) => parseISO(a.startedAt).getTime() >= cutoffTime
  );
  if (db.applicationActivity.length !== appCountBefore) modified = true;

  const inputCountBefore = db.inputActivity.length;
  db.inputActivity = db.inputActivity.filter(
    (i) => parseISO(i.bucketStart).getTime() >= cutoffTime
  );
  if (db.inputActivity.length !== inputCountBefore) modified = true;

  const fileCountBefore = db.fileActivity.length;
  db.fileActivity = db.fileActivity.filter(
    (f) => parseISO(f.timestamp).getTime() >= cutoffTime
  );
  if (db.fileActivity.length !== fileCountBefore) modified = true;

  const idleCountBefore = db.idlePeriods.length;
  db.idlePeriods = db.idlePeriods.filter(
    (id) => parseISO(id.startedAt).getTime() >= cutoffTime
  );
  if (db.idlePeriods.length !== idleCountBefore) modified = true;

  const batchCountBefore = db.processedBatches.length;
  db.processedBatches = db.processedBatches.filter(
    (b) => parseISO(b.processedAt).getTime() >= processedBatchCutoffTime
  );
  if (db.processedBatches.length !== batchCountBefore) modified = true;

  db.metadata.lastRetentionCleanupAt = now.toISOString();
  return modified;
}

export async function mutateDatabase<T>(
  mutation: (database: DatabaseSchema) => T | Promise<T>
): Promise<T> {
  const execute = async () => {
    let releaseLock: (() => void) | null = null;
    try {
      releaseLock = await acquireFileLock();

      let db: DatabaseSchema;
      if (!fs.existsSync(DATABASE_PATH)) {
        const dir = path.dirname(DATABASE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        db = createDefaultDatabase();
      } else {
        const content = fs.readFileSync(DATABASE_PATH, "utf-8").trim();
        if (!content || content === "{}") {
          db = createDefaultDatabase();
        } else {
          try {
            db = JSON.parse(content) as DatabaseSchema;
            if (!db || !db.metadata || !db.settings) {
              db = createDefaultDatabase(db?.settings);
            }
          } catch {
            db = createDefaultDatabase();
          }
        }
      }

      applyRetentionCleanup(db);

      const result = await mutation(db);

      db.metadata.updatedAt = new Date().toISOString();

      const dir = path.dirname(DATABASE_PATH);
      const tempPath = path.join(
        dir,
        `db.${Date.now()}.${process.pid}.${crypto.randomUUID()}.tmp`
      );

      const serialized = JSON.stringify(db, null, 2);
      fs.writeFileSync(tempPath, serialized, "utf-8");

      fs.renameSync(tempPath, DATABASE_PATH);

      return result;
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  };

  const nextPromise = inProcessQueue.then(execute, execute);
  inProcessQueue = nextPromise;
  return nextPromise;
}
