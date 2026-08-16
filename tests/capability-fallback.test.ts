import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capabilities } from "@/collector/capabilities";

describe("Capability Fallback & Status Registry", () => {
  it("tracks capability availability and error reasons", () => {
    capabilities.set("activeWindow", { available: true });
    capabilities.set("keyboardCount", {
      available: false,
      reason: "uiohook-napi native module not available",
      recoverable: false,
    });

    const status = capabilities.get();

    assert.equal(status.activeWindow.available, true);
    assert.equal(status.keyboardCount.available, false);
    if (!status.keyboardCount.available) {
      assert.equal(status.keyboardCount.reason, "uiohook-napi native module not available");
      assert.equal(status.keyboardCount.recoverable, false);
    }
  });
});
