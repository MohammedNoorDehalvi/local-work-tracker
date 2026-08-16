import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDefaultDatabase } from "@/lib/db";
import { ingestEventBatch } from "@/lib/event-ingestion";
import { IngestBatchPayload } from "@/lib/types";

describe("Event Ingestion Engine", () => {
  it("ingests application events and deduplicates duplicate batchId", () => {
    const db = createDefaultDatabase();
    const batchId = "batch-uuid-1";
    const sessionId = "session-uuid-1";
    const now = new Date().toISOString();

    const payload: IngestBatchPayload = {
      schemaVersion: 1,
      batchId,
      collectorInstanceId: "collector-1",
      createdAt: now,
      sequenceNumber: 1,
      events: [
        {
          type: "application",
          payload: {
            id: "app-1",
            sessionId,
            appName: "Firefox",
            executableName: "firefox.exe",
            windowTitle: "Search",
            startedAt: now,
            endedAt: now,
            durationSeconds: 15,
            isIdle: false,
          },
        },
      ],
      capabilities: {
        activeWindow: { available: true },
        idleDetection: { available: true },
        keyboardCount: { available: true },
        mouseCount: { available: true },
        fileMonitoring: { available: true },
      },
    };

    // First ingestion
    const res1 = ingestEventBatch(db, payload);
    assert.equal(res1.accepted, true);
    assert.equal(res1.duplicate, false);
    assert.equal(res1.acceptedEventCount, 1);
    assert.equal(db.applicationActivity.length, 1);

    // Replay same batch
    const res2 = ingestEventBatch(db, payload);
    assert.equal(res2.accepted, true);
    assert.equal(res2.duplicate, true);
    assert.equal(res2.acceptedEventCount, 0);
    assert.equal(db.applicationActivity.length, 1); // No duplicates added
  });

  it("merges contiguous adjacent active window samples for the same application", () => {
    const db = createDefaultDatabase();
    db.settings.storeWindowTitles = true;
    const sessionId = "session-1";
    const t1 = "2026-08-16T10:00:00.000Z";
    const t2 = "2026-08-16T10:00:05.000Z";
    const t3 = "2026-08-16T10:00:10.000Z";

    const payload1: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: "b-1",
      collectorInstanceId: "c-1",
      createdAt: t2,
      sequenceNumber: 1,
      events: [
        {
          type: "application",
          payload: {
            id: "app-1",
            sessionId,
            appName: "Code",
            executableName: "Code.exe",
            windowTitle: "main.ts",
            startedAt: t1,
            endedAt: t2,
            durationSeconds: 5,
            isIdle: false,
          },
        },
      ],
      capabilities: {
        activeWindow: { available: true },
        idleDetection: { available: true },
        keyboardCount: { available: true },
        mouseCount: { available: true },
        fileMonitoring: { available: true },
      },
    };

    const payload2: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: "b-2",
      collectorInstanceId: "c-1",
      createdAt: t3,
      sequenceNumber: 2,
      events: [
        {
          type: "application",
          payload: {
            id: "app-2",
            sessionId,
            appName: "Code",
            executableName: "Code.exe",
            windowTitle: "main.ts",
            startedAt: t2,
            endedAt: t3,
            durationSeconds: 5,
            isIdle: false,
          },
        },
      ],
      capabilities: {
        activeWindow: { available: true },
        idleDetection: { available: true },
        keyboardCount: { available: true },
        mouseCount: { available: true },
        fileMonitoring: { available: true },
      },
    };

    ingestEventBatch(db, payload1);
    assert.equal(db.applicationActivity.length, 1);

    ingestEventBatch(db, payload2);
    // Should be merged into 1 continuous entry
    assert.equal(db.applicationActivity.length, 1);
    assert.equal(db.applicationActivity[0].startedAt, t1);
    assert.equal(db.applicationActivity[0].endedAt, t3);
    assert.equal(db.applicationActivity[0].durationSeconds, 10);
  });
});
