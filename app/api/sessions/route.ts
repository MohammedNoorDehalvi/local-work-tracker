import crypto from "crypto";
import { NextResponse } from "next/server";
import { getDatabaseReadOnly, mutateDatabase } from "@/lib/db";
import { validateClientMutationRequest, validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";
import { sessionActionSchema } from "@/lib/validation";
import { WorkSession } from "@/lib/types";

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
  const sortedSessions = [...db.sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return NextResponse.json(
    { sessions: sortedSessions, total: sortedSessions.length },
    { status: 200, headers: STANDARD_API_HEADERS }
  );
}

export async function POST(request: Request) {
  const securityCheck = validateClientMutationRequest(request);
  if (!securityCheck.valid) {
    return securityCheck.errorResponse!;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = { action: "start" };
  }

  const parseResult = sessionActionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid session request payload." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const nowIso = new Date().toISOString();

  const newSession = await mutateDatabase((db) => {
    // End any currently active or paused session
    for (const s of db.sessions) {
      if (s.status === "active" || s.status === "paused") {
        s.status = "completed";
        s.endedAt = nowIso;
        s.updatedAt = nowIso;
      }
    }

    const session: WorkSession = {
      id: crypto.randomUUID(),
      startedAt: nowIso,
      endedAt: null,
      activeDurationSeconds: 0,
      idleDurationSeconds: 0,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.sessions.push(session);
    return session;
  });

  return NextResponse.json(newSession, { status: 201, headers: STANDARD_API_HEADERS });
}

export async function PATCH(request: Request) {
  const securityCheck = validateClientMutationRequest(request);
  if (!securityCheck.valid) {
    return securityCheck.errorResponse!;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const parseResult = sessionActionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid session action payload." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const { action, sessionId } = parseResult.data;
  const nowIso = new Date().toISOString();

  const updatedSession = await mutateDatabase((db) => {
    const session = sessionId
      ? db.sessions.find((s) => s.id === sessionId)
      : db.sessions.find((s) => s.status === "active" || s.status === "paused");

    if (!session) {
      return null;
    }

    switch (action) {
      case "pause": {
        if (session.status === "active") {
          session.status = "paused";
          session.updatedAt = nowIso;
        }
        break;
      }
      case "resume": {
        if (session.status === "paused") {
          session.status = "active";
          session.updatedAt = nowIso;
        }
        break;
      }
      case "end": {
        session.status = "completed";
        session.endedAt = nowIso;
        session.updatedAt = nowIso;
        break;
      }
    }

    return session;
  });

  if (!updatedSession) {
    return NextResponse.json(
      { error: "Session not found or no active session to update." },
      { status: 404, headers: STANDARD_API_HEADERS }
    );
  }

  return NextResponse.json(updatedSession, { status: 200, headers: STANDARD_API_HEADERS });
}
