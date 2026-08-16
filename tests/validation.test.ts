import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applicationActivitySchema,
  ingestBatchSchema,
  deleteDataSchema,
} from "@/lib/validation";

describe("Zod Validation Schemas", () => {
  it("validates valid application activity and strips control characters", () => {
    const valid = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      appName: "Visual Studio Code\u0000", // Has null control char
      executableName: "Code.exe",
      windowTitle: "project.ts",
      startedAt: "2026-08-16T10:00:00.000Z",
      endedAt: "2026-08-16T10:00:15.000Z",
      durationSeconds: 15,
      isIdle: false,
    };

    const parsed = applicationActivitySchema.parse(valid);
    assert.equal(parsed.appName, "Visual Studio Code"); // Stripped control char
    assert.equal(parsed.durationSeconds, 15);
  });

  it("rejects application activity where endedAt precedes startedAt", () => {
    const invalid = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      sessionId: "123e4567-e89b-12d3-a456-426614174001",
      appName: "Code",
      executableName: "Code.exe",
      windowTitle: null,
      startedAt: "2026-08-16T10:00:15.000Z",
      endedAt: "2026-08-16T10:00:00.000Z", // Precedes startedAt
      durationSeconds: 15,
      isIdle: false,
    };

    const result = applicationActivitySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  it("rejects batch payloads with timestamps too far in the future", () => {
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const batch = {
      schemaVersion: 1,
      batchId: "123e4567-e89b-12d3-a456-426614174000",
      collectorInstanceId: "123e4567-e89b-12d3-a456-426614174001",
      createdAt: futureTime,
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

    const result = ingestBatchSchema.safeParse(batch);
    assert.equal(result.success, false);
  });

  it("requires DELETE_ALL_DATA confirmation string for data deletion", () => {
    assert.equal(deleteDataSchema.safeParse({ confirmation: "DELETE_ALL_DATA" }).success, true);
    assert.equal(deleteDataSchema.safeParse({ confirmation: "yes" }).success, false);
    assert.equal(deleteDataSchema.safeParse({ confirmation: "DELETE" }).success, false);
  });
});
