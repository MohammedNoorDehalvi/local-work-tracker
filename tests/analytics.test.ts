import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateAnalytics } from "@/lib/analytics";
import { createDefaultDatabase } from "@/lib/db";
import { calculateDateRange } from "@/lib/date-utils";
import { ApplicationActivity, WorkSession, IdlePeriod } from "@/lib/types";

describe("Analytics Engine", () => {
  it("handles empty database gracefully with zero fabricated data", () => {
    const db = createDefaultDatabase();
    const interval = calculateDateRange("today");
    const result = calculateAnalytics(db, interval);

    assert.equal(result.summary.totalActiveDurationSeconds, 0);
    assert.equal(result.summary.totalIdleDurationSeconds, 0);
    assert.equal(result.summary.productivePercentage, 0);
    assert.equal(result.summary.sessionCount, 0);
    assert.equal(result.summary.mostUsedApplication, null);
    assert.equal(result.topApplications.length, 0);
    assert.equal(result.dailyTotals.length, 0);
    assert.equal(result.fileMetrics.totalEvents, 0);
  });

  it("calculates active work time, idle duration, and productive percentage accurately", () => {
    const db = createDefaultDatabase();
    const sessionId = "session-123";
    const today = new Date().toISOString();

    const app1: ApplicationActivity = {
      id: "app-1",
      sessionId,
      appName: "Visual Studio Code",
      executableName: "Code.exe",
      windowTitle: "db.ts",
      startedAt: today,
      endedAt: today,
      durationSeconds: 1800, // 30 mins
      isIdle: false,
    };

    const app2: ApplicationActivity = {
      id: "app-2",
      sessionId,
      appName: "Google Chrome",
      executableName: "chrome.exe",
      windowTitle: "Documentation",
      startedAt: today,
      endedAt: today,
      durationSeconds: 600, // 10 mins
      isIdle: false,
    };

    const idle: IdlePeriod = {
      id: "idle-1",
      sessionId,
      startedAt: today,
      endedAt: today,
      durationSeconds: 600, // 10 mins idle
    };

    const session: WorkSession = {
      id: sessionId,
      startedAt: today,
      endedAt: today,
      activeDurationSeconds: 2400,
      idleDurationSeconds: 600,
      status: "completed",
      createdAt: today,
      updatedAt: today,
    };

    db.applicationActivity = [app1, app2];
    db.idlePeriods = [idle];
    db.sessions = [session];

    const interval = calculateDateRange("today");
    const result = calculateAnalytics(db, interval);

    assert.equal(result.summary.totalActiveDurationSeconds, 2400); // 40 mins
    assert.equal(result.summary.totalIdleDurationSeconds, 600); // 10 mins
    assert.equal(result.summary.totalDurationSeconds, 3000); // 50 mins total
    // 2400 / 3000 = 80%
    assert.equal(result.summary.productivePercentage, 80);
    assert.equal(result.summary.mostUsedApplication, "Visual Studio Code");
    assert.equal(result.topApplications.length, 2);
    assert.equal(result.topApplications[0].appName, "Visual Studio Code");
    assert.equal(result.topApplications[0].percentage, 75); // 1800 / 2400 = 75%
  });

  it("calculates application switches correctly", () => {
    const db = createDefaultDatabase();
    const sessionId = "session-1";
    const now = new Date().toISOString();

    db.applicationActivity = [
      {
        id: "1",
        sessionId,
        appName: "Code",
        executableName: "Code.exe",
        windowTitle: null,
        startedAt: now,
        endedAt: now,
        durationSeconds: 100,
        isIdle: false,
      },
      {
        id: "2",
        sessionId,
        appName: "Terminal",
        executableName: "cmd.exe",
        windowTitle: null,
        startedAt: now,
        endedAt: now,
        durationSeconds: 50,
        isIdle: false,
      },
      {
        id: "3",
        sessionId,
        appName: "Code",
        executableName: "Code.exe",
        windowTitle: null,
        startedAt: now,
        endedAt: now,
        durationSeconds: 100,
        isIdle: false,
      },
    ];

    const result = calculateAnalytics(db, calculateDateRange("today"));
    assert.equal(result.summary.totalApplicationSwitches, 2);
  });
});
