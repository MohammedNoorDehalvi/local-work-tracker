if (typeof window !== "undefined") {
  throw new Error("This module cannot be imported from the client side.");
}

import { INGESTION_LIMITS } from "./server-env";

export class PayloadTooLargeError extends Error {
  constructor(message = "Payload exceeds maximum allowed size of 1MB") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads a Request body as a bounded UTF-8 string up to the specified byte limit.
 * Enforces Content-Length upfront if declared, and streams chunks with strict byte counting
 * before any JSON parsing occurs.
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number = INGESTION_LIMITS.maximumBodyBytes,
): Promise<string> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredLength) && declaredLength > maxBytes) {
      throw new PayloadTooLargeError(`Declared Content-Length (${declaredLength} bytes) exceeds limit of ${maxBytes} bytes`);
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new PayloadTooLargeError(`Request body exceeded maximum allowed limit of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(combined);
}
