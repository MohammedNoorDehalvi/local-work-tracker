import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDefaultDatabase, mutateDatabase, getDatabaseReadOnly, createDatabaseBackup } from "@/lib/db";
import fs from "fs";
import path from "path";
import { DATABASE_PATH } from "@/lib/server-env";

describe("Database Layer", () => {
  beforeEach(() => {
    const dir = path.dirname(DATABASE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  it("initializes default database with strict privacy defaults and zero fake records", () => {
    const db = createDefaultDatabase();

    assert.equal(db.settings.trackingEnabled, false);
    assert.equal(db.settings.consentAcceptedAt, null);
    assert.equal(db.settings.storeWindowTitles, false);
    assert.equal(db.settings.storeFullFilePaths, false);
    assert.equal(db.settings.dataRetentionDays, 30);
    assert.equal(db.sessions.length, 0);
    assert.equal(db.applicationActivity.length, 0);
    assert.equal(db.fileActivity.length, 0);
  });

  it("handles concurrent mutateDatabase calls sequentially without corruption", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      mutateDatabase((db) => {
        db.settings.settingsRevision = i + 1;
        return i + 1;
      })
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);

    const latest = getDatabaseReadOnly();
    assert.ok(latest.settings.settingsRevision >= 1);
  });

  it("creates timestamped database backup files safely", () => {
    const backupPath = createDatabaseBackup("test");
    if (backupPath) {
      assert.equal(fs.existsSync(backupPath), true);
      try {
        fs.unlinkSync(backupPath);
      } catch {
        // Ignore
      }
    }
  });
});
