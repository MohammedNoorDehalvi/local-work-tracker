import { NextResponse } from "next/server";
import { getDatabaseReadOnly, mutateDatabase } from "@/lib/db";
import { validateClientMutationRequest, validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";
import { updateSettingsSchema } from "@/lib/validation";

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
  return NextResponse.json(db.settings, { status: 200, headers: STANDARD_API_HEADERS });
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

  const parseResult = updateSettingsSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid settings update payload.", details: parseResult.error.format() },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const updates = parseResult.data;

  const updatedSettings = await mutateDatabase((db) => {
    db.settings = {
      ...db.settings,
      ...updates,
      settingsRevision: db.settings.settingsRevision + 1,
    };
    return db.settings;
  });

  return NextResponse.json(updatedSettings, { status: 200, headers: STANDARD_API_HEADERS });
}
