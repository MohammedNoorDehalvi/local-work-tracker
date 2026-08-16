if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import crypto from "crypto";

const CSRF_COOKIE_NAME = "cgs_session_id";
const CSRF_HEADER_NAME = "x-csrf-token";

const CSRF_SECRET = crypto.randomBytes(32).toString("hex");

function signSessionId(sessionId: string): string {
  return crypto.createHmac("sha256", CSRF_SECRET).update(sessionId).digest("hex");
}

export function generateCsrfPair(existingSessionId?: string): {
  sessionId: string;
  csrfToken: string;
  cookieHeader: string;
} {
  const sessionId = existingSessionId || crypto.randomUUID();
  const signature = signSessionId(sessionId);
  const csrfToken = `${sessionId}.${signature}`;

  const cookieHeader = `${CSRF_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;

  return {
    sessionId,
    csrfToken,
    cookieHeader,
  };
}

export function getSessionIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === CSRF_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function validateCsrfToken(cookieHeader: string | null, tokenHeader: string | null): boolean {
  if (!cookieHeader || !tokenHeader) {
    return false;
  }

  const sessionId = getSessionIdFromCookies(cookieHeader);
  if (!sessionId) {
    return false;
  }

  const parts = tokenHeader.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [tokenSessionId, providedSignature] = parts;
  if (tokenSessionId !== sessionId) {
    return false;
  }

  const expectedSignature = signSessionId(sessionId);
  const providedBuffer = Buffer.from(providedSignature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
