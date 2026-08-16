import { NextResponse } from "next/server";
import { generateCsrfPair, getSessionIdFromCookies } from "@/lib/csrf";
import { STANDARD_API_HEADERS, validateLocalOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Origin unauthorized" },
      { status: 403, headers: STANDARD_API_HEADERS }
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const existingSessionId = getSessionIdFromCookies(cookieHeader) || undefined;

  const { csrfToken, cookieHeader: newCookieHeader } = generateCsrfPair(existingSessionId);

  const response = NextResponse.json(
    { csrfToken },
    {
      status: 200,
      headers: {
        ...STANDARD_API_HEADERS,
        "Set-Cookie": newCookieHeader,
      },
    }
  );

  return response;
}
