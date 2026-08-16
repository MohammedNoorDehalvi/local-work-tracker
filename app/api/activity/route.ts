import { NextResponse } from "next/server";
import { getDatabaseReadOnly } from "@/lib/db";
import { validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";
import { activityQuerySchema } from "@/lib/validation";
import { parseISO } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface UnifiedActivityItem {
  id: string;
  type: "application" | "input" | "file" | "idle";
  timestamp: string;
  sessionId: string;
  appName?: string;
  windowTitle?: string | null;
  durationSeconds?: number;
  isIdle?: boolean;
  fileName?: string;
  fileExtension?: string;
  fileEventType?: string;
  keyPressCount?: number;
  mouseClickCount?: number;
}

export async function GET(request: Request) {
  if (!validateLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Origin unauthorized" },
      { status: 403, headers: STANDARD_API_HEADERS }
    );
  }

  const url = new URL(request.url);
  const queryParams = {
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    application: url.searchParams.get("application") || undefined,
    eventType: url.searchParams.get("eventType") || "all",
    sessionId: url.searchParams.get("sessionId") || undefined,
    page: url.searchParams.get("page") || "1",
    limit: url.searchParams.get("limit") || "50",
  };

  const parseResult = activityQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid activity query parameters." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const { from, to, application, eventType, sessionId, page, limit } = parseResult.data;
  const db = getDatabaseReadOnly();

  const fromMs = from ? parseISO(from).getTime() : 0;
  const toMs = to ? parseISO(to).getTime() : Number.MAX_SAFE_INTEGER;

  const items: UnifiedActivityItem[] = [];

  // 1. Applications
  if (eventType === "all" || eventType === "application") {
    for (const app of db.applicationActivity) {
      const timeMs = parseISO(app.startedAt).getTime();
      if (timeMs >= fromMs && timeMs <= toMs) {
        if (sessionId && app.sessionId !== sessionId) continue;
        if (application && !app.appName.toLowerCase().includes(application.toLowerCase())) continue;

        items.push({
          id: app.id,
          type: "application",
          timestamp: app.startedAt,
          sessionId: app.sessionId,
          appName: app.appName,
          windowTitle: app.windowTitle,
          durationSeconds: app.durationSeconds,
          isIdle: app.isIdle,
        });
      }
    }
  }

  // 2. Input Activity
  if (eventType === "all" || eventType === "input") {
    for (const inp of db.inputActivity) {
      const timeMs = parseISO(inp.bucketStart).getTime();
      if (timeMs >= fromMs && timeMs <= toMs) {
        if (sessionId && inp.sessionId !== sessionId) continue;

        items.push({
          id: inp.id,
          type: "input",
          timestamp: inp.bucketStart,
          sessionId: inp.sessionId,
          keyPressCount: inp.keyPressCount,
          mouseClickCount: inp.mouseClickCount,
        });
      }
    }
  }

  // 3. File Activity
  if (eventType === "all" || eventType === "file") {
    for (const file of db.fileActivity) {
      const timeMs = parseISO(file.timestamp).getTime();
      if (timeMs >= fromMs && timeMs <= toMs) {
        if (sessionId && file.sessionId !== sessionId) continue;

        items.push({
          id: file.id,
          type: "file",
          timestamp: file.timestamp,
          sessionId: file.sessionId,
          fileName: file.fileName,
          fileExtension: file.fileExtension,
          fileEventType: file.eventType,
        });
      }
    }
  }

  // 4. Idle Periods
  if (eventType === "all" || eventType === "idle") {
    for (const idle of db.idlePeriods) {
      const timeMs = parseISO(idle.startedAt).getTime();
      if (timeMs >= fromMs && timeMs <= toMs) {
        if (sessionId && idle.sessionId !== sessionId) continue;

        items.push({
          id: idle.id,
          type: "idle",
          timestamp: idle.startedAt,
          sessionId: idle.sessionId,
          durationSeconds: idle.durationSeconds,
          isIdle: true,
        });
      }
    }
  }

  // Sort descending by timestamp
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return NextResponse.json(
    {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    { status: 200, headers: STANDARD_API_HEADERS }
  );
}
