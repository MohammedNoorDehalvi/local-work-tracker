if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import { NextResponse } from "next/server";
import { validateCsrfToken } from "./csrf";

const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

const ALLOWED_HOSTS = new Set([
  "127.0.0.1:3000",
  "localhost:3000",
  "127.0.0.1",
  "localhost",
]);

export function validateLocalOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host || !ALLOWED_HOSTS.has(host)) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return false;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (!ALLOWED_ORIGINS.has(url.origin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function validateJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) {
    return false;
  }
  return contentType.toLowerCase().includes("application/json");
}

export const STANDARD_API_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
};

export function validateClientMutationRequest(request: Request): {
  valid: boolean;
  errorResponse?: NextResponse;
} {
  if (!validateLocalOrigin(request)) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: "Forbidden: Request origin is not authorized." },
        { status: 403, headers: STANDARD_API_HEADERS }
      ),
    };
  }

  if (!validateJsonContentType(request)) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: "Unsupported Media Type: Expected application/json." },
        { status: 415, headers: STANDARD_API_HEADERS }
      ),
    };
  }

  const cookieHeader = request.headers.get("cookie");
  const csrfHeader = request.headers.get("x-csrf-token");

  if (!validateCsrfToken(cookieHeader, csrfHeader)) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: "Forbidden: Invalid or missing CSRF token." },
        { status: 403, headers: STANDARD_API_HEADERS }
      ),
    };
  }

  return { valid: true };
}
