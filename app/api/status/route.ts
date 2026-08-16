import fs from "fs";
import { NextResponse } from "next/server";
import { getDatabaseReadOnly } from "@/lib/db";
import { APP_VERSION, DATABASE_PATH } from "@/lib/server-env";
import { StatusResponse } from "@/lib/types";
import { validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Origin unauthorized" },
      { status: 403, headers: STANDARD_API_HEADERS }
    );
  }

  const db = getDatabaseReadOnly();
  const nowMs = Date.now();

  // Check heartbeat freshness (stale if > 30 seconds old)
  const lastHeartbeatMs = db.collectorStatus.lastHeartbeatAt
    ? new Date(db.collectorStatus.lastHeartbeatAt).getTime()
    : 0;
  const isConnected = lastHeartbeatMs > 0 && nowMs - lastHeartbeatMs < 30000;

  const currentSession = db.sessions.find((s) => s.status === "active") || null;

  let dbSizeKb = 0;
  try {
    if (fs.existsSync(DATABASE_PATH)) {
      dbSizeKb = Math.round(fs.statSync(DATABASE_PATH).size / 1024);
    }
  } catch {
    // Ignore
  }

  const response: StatusResponse = {
    server: {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      version: APP_VERSION,
    },
    collector: {
      connected: isConnected,
      running: db.collectorStatus.running && isConnected,
      processId: db.collectorStatus.processId,
      lastHeartbeatAt: db.collectorStatus.lastHeartbeatAt,
      lastEventAt: db.collectorStatus.lastEventAt,
      lastError: db.collectorStatus.lastError,
      capabilities: db.collectorStatus.capabilities,
    },
    trackingEnabled: db.settings.trackingEnabled,
    consentAccepted: db.settings.consentAcceptedAt !== null,
    currentSession,
    databaseStats: {
      totalSessions: db.sessions.length,
      totalActivityRecords: db.applicationActivity.length,
      totalFileRecords: db.fileActivity.length,
      totalInputBuckets: db.inputActivity.length,
      databaseSizeKilobytes: dbSizeKb,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: STANDARD_API_HEADERS,
  });
}
