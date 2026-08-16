import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { LocalEventSpool } from "@/collector/local-spool";
import { IngestBatchPayload, IngestRejectionResponse } from "@/lib/types";
import fs from "fs";
import path from "path";

describe("Local Event Spool", () => {
  const testPendingPath = path.resolve(process.cwd(), "data/test-pending.ndjson");
  const testRejectedPath = path.resolve(process.cwd(), "data/test-rejected.ndjson");
  let spool: LocalEventSpool;

  beforeEach(() => {
    spool = new LocalEventSpool(testPendingPath, testRejectedPath);
    if (fs.existsSync(testPendingPath)) fs.unlinkSync(testPendingPath);
    if (fs.existsSync(testRejectedPath)) fs.unlinkSync(testRejectedPath);
  });

  afterEach(() => {
    if (fs.existsSync(testPendingPath)) fs.unlinkSync(testPendingPath);
    if (fs.existsSync(testRejectedPath)) fs.unlinkSync(testRejectedPath);
  });

  it("enqueues, reads, and acknowledges batches cleanly", () => {
    const batch1: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: "batch-1",
      collectorInstanceId: "c-1",
      createdAt: new Date().toISOString(),
      sequenceNumber: 1,
      events: [],
      capabilities: {
        activeWindow: { available: true },
        idleDetection: { available: true },
        keyboardCount: { available: true },
        mouseCount: { available: true },
        fileMonitoring: { available: true },
      },
    };

    const batch2: IngestBatchPayload = {
      ...batch1,
      batchId: "batch-2",
      sequenceNumber: 2,
    };

    spool.enqueueBatch(batch1);
    spool.enqueueBatch(batch2);

    const pending = spool.readPendingBatches();
    assert.equal(pending.length, 2);
    assert.equal(pending[0].batchId, "batch-1");
    assert.equal(pending[1].batchId, "batch-2");

    // Acknowledge batch-1
    spool.acknowledgeBatch("batch-1");
    const remaining = spool.readPendingBatches();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].batchId, "batch-2");
  });

  it("quarantines unretryable rejected batches into rejected-events.ndjson", () => {
    const badBatch: IngestBatchPayload = {
      schemaVersion: 1,
      batchId: "bad-batch",
      collectorInstanceId: "c-1",
      createdAt: new Date().toISOString(),
      sequenceNumber: 1,
      events: [],
      capabilities: {
        activeWindow: { available: true },
        idleDetection: { available: true },
        keyboardCount: { available: true },
        mouseCount: { available: true },
        fileMonitoring: { available: true },
      },
    };

    spool.enqueueBatch(badBatch);
    assert.equal(spool.readPendingBatches().length, 1);

    const rejection: IngestRejectionResponse = {
      accepted: false,
      retryable: false,
      code: "INVALID_SCHEMA",
      message: "Bad schema",
    };

    spool.quarantineBatch(badBatch, rejection);

    // Removed from pending
    assert.equal(spool.readPendingBatches().length, 0);
    // Added to rejected
    assert.equal(fs.existsSync(testRejectedPath), true);
    const content = fs.readFileSync(testRejectedPath, "utf-8");
    assert.ok(content.includes("bad-batch"));
    assert.ok(content.includes("INVALID_SCHEMA"));
  });
});
