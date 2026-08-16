import {
  DatabaseSchema,
  IngestBatchPayload,
  IngestResponse,
  ApplicationActivity,
} from "./types";
import { parseISO, differenceInSeconds } from "date-fns";

/**
 * Merges an application activity into the applicationActivity array.
 * If the record is contiguous and matches the last recorded activity, merges them.
 */
function mergeApplicationActivity(
  activities: ApplicationActivity[],
  newActivity: ApplicationActivity
): void {
  if (activities.length === 0) {
    activities.push(newActivity);
    return;
  }

  const last = activities[activities.length - 1];
  const sameSession = last.sessionId === newActivity.sessionId;
  const sameApp = last.appName.toLowerCase() === newActivity.appName.toLowerCase();
  const sameTitle = last.windowTitle === newActivity.windowTitle;
  const sameIdle = last.isIdle === newActivity.isIdle;

  const gapSeconds = Math.abs(
    differenceInSeconds(parseISO(newActivity.startedAt), parseISO(last.endedAt))
  );

  // Merge if contiguous within 10 seconds and identical metadata
  if (sameSession && sameApp && sameTitle && sameIdle && gapSeconds <= 10) {
    last.endedAt = newActivity.endedAt;
    last.durationSeconds = Math.max(
      0,
      differenceInSeconds(parseISO(last.endedAt), parseISO(last.startedAt))
    );
  } else {
    activities.push(newActivity);
  }
}

/**
 * Ingests a validated batch of collector events into the database.
 * Returns IngestResponse indicating whether it was accepted and if it was a duplicate.
 */
export function ingestEventBatch(
  db: DatabaseSchema,
  payload: IngestBatchPayload
): IngestResponse {
  const nowIso = new Date().toISOString();

  // 1. Check for duplicate batchId
  const isDuplicate = db.processedBatches.some((b) => b.batchId === payload.batchId);
  if (isDuplicate) {
    return {
      accepted: true,
      batchId: payload.batchId,
      duplicate: true,
      acceptedEventCount: 0,
      serverReceivedAt: nowIso,
      settingsRevision: db.settings.settingsRevision,
      sessionRevision: db.sessions.length,
    };
  }

  // 2. Process events
  let acceptedCount = 0;

  for (const event of payload.events) {
    switch (event.type) {
      case "application": {
        // Enforce privacy setting: if storeWindowTitles is false, clear title
        if (!db.settings.storeWindowTitles) {
          event.payload.windowTitle = null;
        }
        mergeApplicationActivity(db.applicationActivity, event.payload);
        acceptedCount++;

        // Update active work session duration if present
        const session = db.sessions.find((s) => s.id === event.payload.sessionId);
        if (session && session.status === "active") {
          if (!event.payload.isIdle) {
            session.activeDurationSeconds += event.payload.durationSeconds;
          }
          session.updatedAt = nowIso;
        }
        break;
      }
      case "input": {
        db.inputActivity.push(event.payload);
        acceptedCount++;
        break;
      }
      case "file": {
        // Enforce privacy: if storeFullFilePaths is false, ensure directory is only parent name or hash
        if (!db.settings.storeFullFilePaths && event.payload.parentDirectory.length > 64) {
          event.payload.parentDirectory = event.payload.parentDirectory.slice(0, 32);
        }
        db.fileActivity.push(event.payload);
        acceptedCount++;
        break;
      }
      case "idle": {
        db.idlePeriods.push(event.payload);
        acceptedCount++;

        // Update idle duration on active session
        const session = db.sessions.find((s) => s.id === event.payload.sessionId);
        if (session && session.status === "active") {
          session.idleDurationSeconds += event.payload.durationSeconds;
          session.updatedAt = nowIso;
        }
        break;
      }
    }
  }

  // 3. Update collector status & capabilities
  db.collectorStatus.running = true;
  db.collectorStatus.instanceId = payload.collectorInstanceId;
  db.collectorStatus.lastHeartbeatAt = nowIso;
  db.collectorStatus.lastEventAt = nowIso;
  db.collectorStatus.capabilities = payload.capabilities;

  // 4. Record processed batch ID
  db.processedBatches.push({
    batchId: payload.batchId,
    collectorInstanceId: payload.collectorInstanceId,
    processedAt: nowIso,
  });

  return {
    accepted: true,
    batchId: payload.batchId,
    duplicate: false,
    acceptedEventCount: acceptedCount,
    serverReceivedAt: nowIso,
    settingsRevision: db.settings.settingsRevision,
    sessionRevision: db.sessions.length,
  };
}
