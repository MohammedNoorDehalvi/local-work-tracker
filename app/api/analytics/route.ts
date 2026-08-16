import { NextResponse } from "next/server";
import { getDatabaseReadOnly } from "@/lib/db";
import { validateLocalOrigin, STANDARD_API_HEADERS } from "@/lib/request-security";
import { analyticsQuerySchema } from "@/lib/validation";
import { calculateDateRange } from "@/lib/date-utils";
import { calculateAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Origin unauthorized" },
      { status: 403, headers: STANDARD_API_HEADERS }
    );
  }

  const url = new URL(request.url);
  const queryParams = {
    range: url.searchParams.get("range") || "today",
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
  };

  const parseResult = analyticsQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid analytics query parameters." },
      { status: 400, headers: STANDARD_API_HEADERS }
    );
  }

  const { range, from, to } = parseResult.data;
  const db = getDatabaseReadOnly();
  const interval = calculateDateRange(range, from, to);

  const analytics = calculateAnalytics(db, interval);

  return NextResponse.json(analytics, {
    status: 200,
    headers: STANDARD_API_HEADERS,
  });
}
