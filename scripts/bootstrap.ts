import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

const CWD = process.cwd();
const DATA_DIR = path.join(CWD, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const DB_PATH = path.join(DATA_DIR, "db.json");
const GITKEEP_PATH = path.join(DATA_DIR, ".gitkeep");
const TOKEN_PATH = path.join(CWD, ".collector-token");
const SALT_PATH = path.join(CWD, ".path-salt");

function secureWindowsFile(filePath: string): void {
  if (process.platform === "win32") {
    try {
      const username = process.env.USERNAME;
      if (username) {
        // Disable inheritance and grant read/write to current user only
        execSync(`icacls "${filePath}" /inheritance:r /grant:r "${username}:(R,W)" /Q`, {
          stdio: "ignore",
        });
      }
    } catch {
      // Best-effort ACL application
    }
  }
}

export function bootstrap(): void {
  // 1. Create data directories
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (!fs.existsSync(GITKEEP_PATH)) {
    fs.writeFileSync(GITKEEP_PATH, "# Data folder marker\n", "utf-8");
  }

  // 2. Generate Collector Token if missing
  if (!fs.existsSync(TOKEN_PATH)) {
    const token = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(TOKEN_PATH, token, { encoding: "utf-8", mode: 0o600 });
    secureWindowsFile(TOKEN_PATH);
  }

  // 3. Generate Path Hashing Salt if missing
  if (!fs.existsSync(SALT_PATH)) {
    const salt = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(SALT_PATH, salt, { encoding: "utf-8", mode: 0o600 });
    secureWindowsFile(SALT_PATH);
  }

  // 4. Initialize empty database if missing
  if (!fs.existsSync(DB_PATH)) {
    const now = new Date().toISOString();
    const emptyDb = {
      metadata: {
        version: 1,
        createdAt: now,
        updatedAt: now,
        lastRetentionCleanupAt: null,
      },
      settings: {
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

    fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2), "utf-8");
  }
}

// Run when executed directly
if (process.argv[1]?.includes("bootstrap")) {
  bootstrap();
}
