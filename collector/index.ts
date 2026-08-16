import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  CollectorEvent,
  IngestBatchPayload,
  IngestResponse,
  IngestRejectionResponse,
  CollectorConfigurationResponse,
} from "../lib/types";
import { capabilities } from "./capabilities";
import { PowerShellHelperSupervisor } from "./powershell-helper";
import { IdleDetector } from "./idle-detector";
import { ActiveWindowManager } from "./active-window";
import { InputCounter } from "./input-counter";
import { FileMonitor } from "./file-monitor";
import { LocalEventSpool } from "./local-spool";

const COLLECTOR_INSTANCE_ID = crypto.randomUUID();
const LOCK_PATH = path.resolve(process.cwd(), "data/collector.lock");
const TOKEN_PATH = path.resolve(process.cwd(), ".collector-token");
const API_BASE = "http://127.0.0.1:3000";

let sequenceNumber = 0;
let eventBuffer: CollectorEvent[] = [];
let collectorToken = "";
let isShuttingDown = false;

// 1. Singleton Lock Management
function acquireCollectorLock(): boolean {
  if (fs.existsSync(LOCK_PATH)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, "utf-8"));
      if (lockData && lockData.pid) {
        try {
          process.kill(lockData.pid, 0); // Check if alive
          console.error(
            `Another collector process (PID ${lockData.pid}) is already running. Exiting.`
          );
          return false;
        } catch {
          // Process is dead, stale lock can be replaced
          console.log("Found and cleaned up stale collector lock.");
        }
      }
    } catch {
      // Bad lock format
    }
  }

  const lockDir = path.dirname(LOCK_PATH);
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true });
  }

  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify({
      pid: process.pid,
      instanceId: COLLECTOR_INSTANCE_ID,
      startedAt: new Date().toISOString(),
    }),
    "utf-8"
  );

  return true;
}

function releaseCollectorLock(): void {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, "utf-8"));
      if (lockData.pid === process.pid) {
        fs.unlinkSync(LOCK_PATH);
      }
    }
  } catch {
    // Ignore
  }
}

// 2. Load Auth Token
function loadToken(): string {
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error("Collector token not found. Please run npm run bootstrap.");
    process.exit(1);
  }
  return fs.readFileSync(TOKEN_PATH, "utf-8").trim();
}

// 3. Sub-engine instantiation
const spool = new LocalEventSpool();

const activeWindowManager = new ActiveWindowManager((activity) => {
  eventBuffer.push({ type: "application", payload: activity });
});

const idleDetector = new IdleDetector(300, (idlePeriod) => {
  eventBuffer.push({ type: "idle", payload: idlePeriod });
});

const inputCounter = new InputCounter((bucket) => {
  eventBuffer.push({ type: "input", payload: bucket });
});

const fileMonitor = new FileMonitor(false, "default-salt", (fileActivity) => {
  eventBuffer.push({ type: "file", payload: fileActivity });
});

const helperSupervisor = new PowerShellHelperSupervisor(
  5000,
  false,
  (sample) => {
    idleDetector.updateSample(sample.idleSeconds, sample.timestamp);
    const isIdle = idleDetector.isIdle();
    activeWindowManager.handleSample(sample, isIdle);
  }
);

// 4. Ingest sender
async function sendBatch(batch: IngestBatchPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/collector/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${collectorToken}`,
      },
      body: JSON.stringify(batch),
    });

    if (res.ok) {
      const data = (await res.json()) as IngestResponse;
      if (data.accepted) {
        spool.acknowledgeBatch(batch.batchId);
        return true;
      }
    }

    // Handle rejection
    const status = res.status;
    const errorData = (await res.json().catch(() => null)) as IngestRejectionResponse | null;

    if (status >= 400 && status < 500 && errorData && !errorData.retryable) {
      console.warn(`Batch permanently rejected by server: ${errorData.message}`);
      spool.quarantineBatch(batch, errorData);
    } else {
      // Retryable 5xx or network issue
      spool.enqueueBatch(batch);
    }

    return false;
  } catch {
    // Network offline, spool batch
    spool.enqueueBatch(batch);
    return false;
  }
}

// 5. Buffer Flush
async function flushEventBuffer(): Promise<void> {
  activeWindowManager.flush();
  idleDetector.flush();
  inputCounter.flushBucket();

  if (eventBuffer.length === 0) {
    // Send heartbeat batch even if no events
    const heartbeatBatch: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: crypto.randomUUID(),
      collectorInstanceId: COLLECTOR_INSTANCE_ID,
      createdAt: new Date().toISOString(),
      sequenceNumber: sequenceNumber++,
      events: [],
      capabilities: capabilities.get(),
    };
    await sendBatch(heartbeatBatch);
  } else {
    const eventsToSend = [...eventBuffer];
    eventBuffer = [];

    const batch: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: crypto.randomUUID(),
      collectorInstanceId: COLLECTOR_INSTANCE_ID,
      createdAt: new Date().toISOString(),
      sequenceNumber: sequenceNumber++,
      events: eventsToSend,
      capabilities: capabilities.get(),
    };

    await sendBatch(batch);
  }

  // Attempt replay of any pending spooled batches
  await replayPendingBatches();
}

async function replayPendingBatches(): Promise<void> {
  const pending = spool.readPendingBatches();
  for (const batch of pending) {
    const success = await sendBatch(batch);
    if (!success) {
      break; // Stop replaying if server still unreachable
    }
  }
}

// 6. Configuration Sync Loop
async function syncConfiguration(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/collector/config`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${collectorToken}`,
      },
    });

    if (res.ok) {
      const config = (await res.json()) as CollectorConfigurationResponse;

      const shouldTrack =
        config.consentAcceptedAt !== null &&
        config.trackingEnabled &&
        config.currentSession !== null &&
        config.currentSession.status === "active";

      const activeSessionId = shouldTrack && config.currentSession ? config.currentSession.id : null;

      // Update sub-engine session contexts
      activeWindowManager.setSessionId(activeSessionId);
      idleDetector.setSessionId(activeSessionId);
      idleDetector.setThreshold(config.idleThresholdSeconds);
      inputCounter.setSessionId(activeSessionId);
      fileMonitor.setSessionId(activeSessionId);

      // Reconfigure sub-engines
      helperSupervisor.updateConfig(
        config.pollingIntervalSeconds * 1000,
        config.storeWindowTitles
      );

      fileMonitor.updateConfig(
        config.monitoredFolders,
        config.storeFullFilePaths,
        config.pathHashSalt
      );

      if (shouldTrack) {
        helperSupervisor.start();
        await inputCounter.start();
        fileMonitor.start();
      } else {
        helperSupervisor.stop();
        inputCounter.stop();
        fileMonitor.stop();
      }
    }
  } catch {
    // API server temporarily offline
  }
}

// 7. Main Runner
async function main() {
  if (!acquireCollectorLock()) {
    process.exit(0);
  }

  collectorToken = loadToken();
  console.log(`Collector started (PID: ${process.pid}, Instance: ${COLLECTOR_INSTANCE_ID})`);

  // Initial config sync
  await syncConfiguration();

  // Config sync every 2 seconds
  const configInterval = setInterval(() => {
    if (!isShuttingDown) {
      syncConfiguration().catch(() => {});
    }
  }, 2000);

  // Buffer flush every 15 seconds
  const flushInterval = setInterval(() => {
    if (!isShuttingDown) {
      flushEventBuffer().catch(() => {});
    }
  }, 15000);

  // Graceful shutdown
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("Shutting down collector process gracefully...");

    clearInterval(configInterval);
    clearInterval(flushInterval);

    helperSupervisor.stop();
    inputCounter.stop();
    fileMonitor.stop();

    await flushEventBuffer();
    releaseCollectorLock();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal collector error:", err);
  releaseCollectorLock();
  process.exit(1);
});
