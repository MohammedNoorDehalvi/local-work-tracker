import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readBodyWithLimit, PayloadTooLargeError } from "@/lib/read-limited-body";

describe("Bounded Request Body Reader", () => {
  it("reads small bodies under the limit completely", async () => {
    const jsonStr = JSON.stringify({ message: "Hello world", count: 42 });
    const req = new Request("http://127.0.0.1:3000/api/collector/ingest", {
      method: "POST",
      body: jsonStr,
      headers: { "Content-Type": "application/json" },
    });

    const result = await readBodyWithLimit(req, 1000);
    assert.equal(result, jsonStr);
  });

  it("throws PayloadTooLargeError when Content-Length exceeds declared max bytes", async () => {
    const req = new Request("http://127.0.0.1:3000/api/collector/ingest", {
      method: "POST",
      body: "a",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "2000000",
      },
    });

    await assert.rejects(
      async () => {
        await readBodyWithLimit(req, 1_000_000);
      },
      (err: unknown) => err instanceof PayloadTooLargeError
    );
  });

  it("throws PayloadTooLargeError when streamed chunk size exceeds max bytes", async () => {
    const largeStr = "x".repeat(5000);
    const req = new Request("http://127.0.0.1:3000/api/collector/ingest", {
      method: "POST",
      body: largeStr,
      headers: { "Content-Type": "application/json" },
    });

    await assert.rejects(
      async () => {
        await readBodyWithLimit(req, 2000);
      },
      (err: unknown) => err instanceof PayloadTooLargeError
    );
  });
});
