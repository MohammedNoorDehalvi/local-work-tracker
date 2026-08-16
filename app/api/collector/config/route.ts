import fs from "fs";
import { NextResponse } from "next/server";
import { getDatabaseReadOnly } from "@/lib/db";
import { validateCollectorAuth } from "@/lib/collector-auth";
import { PATH_SALT_PATH } from "@/lib/server-env";
import { STANDARD_API_HEADERS } from "@/lib/request-security";
import { CollectorConfigurationResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!validateCollectorAuth(authHeader)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid collector token" },
      { status: 401, headers: STANDARD_API_HEADERS }
    );
  }

  const db = getDatabaseReadOnly();
  const currentSession = db.sessions.find((s) => s.status === "active") || null;

  let pathHashSalt = "default-salt";
  if (fs.existsSync(PATH_SALT_PATH)) {
    pathHashSalt = fs.readFileSync(PATH_SALT_PATH, "utf-8").trim();
  }

  const response: CollectorConfigurationResponse = {
    settingsRevision: db.settings.settingsRevision,
    sessionRevision: db.sessions.length,
    trackingEnabled: db.settings.trackingEnabled,
    consentAcceptedAt: db.settings.consentAcceptedAt,
    currentSession,
    pollingIntervalSeconds: db.settings.activeWindowPollingIntervalSeconds,
    idleThresholdSeconds: db.settings.idleThresholdSeconds,
    storeWindowTitles: db.settings.storeWindowTitles,
    storeFullFilePaths: db.settings.storeFullFilePaths,
    monitoredFolders: db.settings.monitoredFolders,
    pathHashSalt,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: STANDARD_API_HEADERS,
  });
}
