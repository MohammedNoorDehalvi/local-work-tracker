import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  exportApplicationActivityToCsv,
  exportCompleteDatabaseToJson,
} from "@/lib/export-utils";
import { createDefaultDatabase } from "@/lib/db";
import { ApplicationActivity } from "@/lib/types";

describe("Data Export Utilities", () => {
  it("escapes CSV cells containing commas, quotes, and newlines properly (RFC 4180)", () => {
    const activity: ApplicationActivity = {
      id: "a-1",
      sessionId: "s-1",
      appName: "Word, \"Pro Edition\"",
      executableName: "word.exe",
      windowTitle: "Report\nDraft",
      startedAt: "2026-08-16T10:00:00.000Z",
      endedAt: "2026-08-16T10:30:00.000Z",
      durationSeconds: 1800,
      isIdle: false,
    };

    const csv = exportApplicationActivityToCsv([activity]);

    assert.ok(csv.includes('"Word, ""Pro Edition"""'));
    assert.ok(csv.includes('"Report\nDraft"'));
  });

  it("exports valid JSON with all data sections", () => {
    const db = createDefaultDatabase();
    const jsonStr = exportCompleteDatabaseToJson(db);
    const parsed = JSON.parse(jsonStr);

    assert.ok(parsed.exportedAt);
    assert.ok(parsed.settings);
    assert.ok(parsed.sessions);
    assert.ok(parsed.applicationActivity);
  });
});
