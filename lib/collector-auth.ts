if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import fs from "fs";
import crypto from "crypto";
import { COLLECTOR_TOKEN_PATH } from "./server-env";

let cachedToken: string | null = null;

export function getCollectorToken(): string {
  if (cachedToken) {
    return cachedToken;
  }

  if (!fs.existsSync(COLLECTOR_TOKEN_PATH)) {
    throw new Error("Collector token file not found. Run bootstrap first.");
  }

  const token = fs.readFileSync(COLLECTOR_TOKEN_PATH, "utf-8").trim();
  if (!token || token.length < 32) {
    throw new Error("Collector token in .collector-token is invalid or corrupted.");
  }

  cachedToken = token;
  return token;
}

export function validateCollectorAuth(authorizationHeader: string | null): boolean {
  if (!authorizationHeader) {
    return false;
  }

  const parts = authorizationHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return false;
  }

  const providedToken = parts[1].trim();
  try {
    const expectedToken = getCollectorToken();
    const providedBuffer = Buffer.from(providedToken, "utf-8");
    const expectedBuffer = Buffer.from(expectedToken, "utf-8");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
