import { NextResponse } from "next/server";
import { validateCollectorAuth } from "@/lib/collector-auth";
import { readBodyWithLimit, PayloadTooLargeError } from "@/lib/read-limited-body";
import { ingestBatchSchema } from "@/lib/validation";
import { mutateDatabase } from "@/lib/db";
import { ingestEventBatch } from "@/lib/event-ingestion";
import { STANDARD_API_HEADERS } from "@/lib/request-security";
import { IngestRejectionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Authenticate collector
  const authHeader = request.headers.get("authorization");
  if (!validateCollectorAuth(authHeader)) {
    const rejection: IngestRejectionResponse = {
      accepted: false,
      retryable: false,
      code: "UNAUTHORIZED",
      message: "Collector authorization token is invalid.",
    };
    return NextResponse.json(rejection, { status: 401, headers: STANDARD_API_HEADERS });
  }

  // 2. Read bounded body stream before JSON parse (enforces 1MB limit)
  let rawBody = "";
  try {
    rawBody = await readBodyWithLimit(request);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      const rejection: IngestRejectionResponse = {
        accepted: false,
        retryable: false,
        code: "PAYLOAD_TOO_LARGE",
        message: err.message,
      };
      return NextResponse.json(rejection, { status: 413, headers: STANDARD_API_HEADERS });
    }
    return NextResponse.json(
      { error: "Failed to read request body stream." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  // 3. Parse JSON
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    const rejection: IngestRejectionResponse = {
      accepted: false,
      retryable: false,
      code: "INVALID_SCHEMA",
      message: "Request body is not valid JSON.",
    };
    return NextResponse.json(rejection, { status: 400, headers: STANDARD_API_HEADERS });
  }

  // 4. Validate schema with Zod
  const parseResult = ingestBatchSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const rejection: IngestRejectionResponse = {
      accepted: false,
      retryable: false,
      code: "INVALID_SCHEMA",
      message: `Invalid batch payload: ${issues}`,
    };
    return NextResponse.json(rejection, { status: 422, headers: STANDARD_API_HEADERS });
  }

  const payload = parseResult.data;

  // 5. Ingest into database atomically
  try {
    const result = await mutateDatabase((db) => ingestEventBatch(db, payload));
    return NextResponse.json(result, { status: 200, headers: STANDARD_API_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Ingestion mutation error:", msg);
    return NextResponse.json(
      {
        accepted: false,
        retryable: true,
        code: "RATE_LIMITED",
        message: "Database write error, please retry.",
      },
      { status: 500, headers: STANDARD_API_HEADERS }
    );
  }
}
