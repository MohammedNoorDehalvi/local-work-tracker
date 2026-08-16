import fs from "fs";
import { mutateDatabase, createDatabaseBackup } from "../lib/db";
import { DB_LOCK_PATH } from "../lib/server-env";

async function resetData() {
  const isForce = process.argv.includes("--force");

  if (!isForce && fs.existsSync(DB_LOCK_PATH)) {
    console.error("Error: Database is currently locked by an active process.");
    console.error("Stop running processes or use --force to override.");
    process.exit(1);
  }

  console.log("Creating pre-reset backup...");
  const backupPath = createDatabaseBackup("pre-reset");
  if (backupPath) {
    console.log(`Backup saved to: ${backupPath}`);
  }

  console.log("Resetting activity data in data/db.json...");
  await mutateDatabase((db) => {
    db.sessions = [];
    db.applicationActivity = [];
    db.inputActivity = [];
    db.fileActivity = [];
    db.idlePeriods = [];
    db.processedBatches = [];
  });

  console.log("Activity data successfully cleared. Settings have been preserved.");
}

resetData().catch((err) => {
  console.error("Failed to reset data:", err);
  process.exit(1);
});
