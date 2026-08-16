import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateCsrfPair, validateCsrfToken } from "@/lib/csrf";
import { validateLocalOrigin, validateJsonContentType } from "@/lib/request-security";

describe("Request Security & CSRF", () => {
  it("generates and validates HMAC signed CSRF tokens accurately", () => {
    const { csrfToken, cookieHeader } = generateCsrfPair();

    // Valid check
    const isValid = validateCsrfToken(cookieHeader, csrfToken);
    assert.equal(isValid, true);

    // Tampered token check
    const tamperedToken = `${csrfToken}bad`;
    assert.equal(validateCsrfToken(cookieHeader, tamperedToken), false);

    // Different session check
    const otherCookieHeader = "cgs_session_id=other-uuid; Path=/";
    assert.equal(validateCsrfToken(otherCookieHeader, csrfToken), false);
  });

  it("validates local loopback origins and hosts", () => {
    const validReq1 = new Request("http://127.0.0.1:3000/api/status", {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    });
    assert.equal(validateLocalOrigin(validReq1), true);

    const validReq2 = new Request("http://localhost:3000/api/status", {
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    });
    assert.equal(validateLocalOrigin(validReq2), true);

    const maliciousReq = new Request("http://127.0.0.1:3000/api/status", {
      headers: { host: "127.0.0.1:3000", origin: "http://evil-site.com" },
    });
    assert.equal(validateLocalOrigin(maliciousReq), false);
  });

  it("enforces Content-Type application/json", () => {
    const jsonReq = new Request("http://127.0.0.1:3000/api/settings", {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    assert.equal(validateJsonContentType(jsonReq), true);

    const formReq = new Request("http://127.0.0.1:3000/api/settings", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    assert.equal(validateJsonContentType(formReq), false);
  });
});
