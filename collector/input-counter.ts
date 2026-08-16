import crypto from "crypto";
import { InputActivityBucket } from "../lib/types";
import { capabilities } from "./capabilities";

export type InputBucketCallback = (bucket: InputActivityBucket) => void;

export class InputCounter {
  private isRunning = false;
  private sessionId: string | null = null;
  private currentBucketStart: string | null = null;
  private keyPressCount = 0;
  private mouseClickCount = 0;
  private mouseMoveDistance = 0;
  private onBucket: InputBucketCallback;
  private flushInterval: NodeJS.Timeout | null = null;
  private uIOhook: unknown = null;

  constructor(onBucket: InputBucketCallback) {
    this.onBucket = onBucket;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Dynamic import of optional native dependency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module: any = await import("uiohook-napi").catch(() => null);

      if (module && module.uIOhook) {
        this.uIOhook = module.uIOhook;

        // Keydown event: immediately discard keycode/character identity, increment counter only
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.uIOhook as any).on("keydown", () => {
          if (this.sessionId) {
            this.keyPressCount++;
          }
        });

        // Mouse click / mousedown event: increment counter only
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.uIOhook as any).on("click", () => {
          if (this.sessionId) {
            this.mouseClickCount++;
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.uIOhook as any).start();

        capabilities.set("keyboardCount", { available: true });
        capabilities.set("mouseCount", { available: true });
      } else {
        capabilities.set("keyboardCount", {
          available: false,
          reason: "uiohook-napi native module not available or failed to load",
          recoverable: false,
        });
        capabilities.set("mouseCount", {
          available: false,
          reason: "uiohook-napi native module not available or failed to load",
          recoverable: false,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      capabilities.set("keyboardCount", {
        available: false,
        reason: `Input hook error: ${msg}`,
        recoverable: false,
      });
      capabilities.set("mouseCount", {
        available: false,
        reason: `Input hook error: ${msg}`,
        recoverable: false,
      });
    }

    // Flush buckets every 60 seconds
    this.currentBucketStart = new Date().toISOString();
    this.flushInterval = setInterval(() => {
      this.flushBucket();
    }, 60000);
  }

  public setSessionId(sessionId: string | null): void {
    if (this.sessionId !== sessionId) {
      this.flushBucket();
      this.sessionId = sessionId;
      this.currentBucketStart = new Date().toISOString();
    }
  }

  public flushBucket(nowIso: string = new Date().toISOString()): void {
    if (!this.sessionId || !this.currentBucketStart) {
      this.keyPressCount = 0;
      this.mouseClickCount = 0;
      this.mouseMoveDistance = 0;
      this.currentBucketStart = nowIso;
      return;
    }

    if (this.keyPressCount > 0 || this.mouseClickCount > 0) {
      const bucket: InputActivityBucket = {
        id: crypto.randomUUID(),
        sessionId: this.sessionId,
        bucketStart: this.currentBucketStart,
        bucketEnd: nowIso,
        keyPressCount: this.keyPressCount,
        mouseClickCount: this.mouseClickCount,
        mouseMoveDistance: this.mouseMoveDistance,
      };

      this.onBucket(bucket);
    }

    this.keyPressCount = 0;
    this.mouseClickCount = 0;
    this.mouseMoveDistance = 0;
    this.currentBucketStart = nowIso;
  }

  public stop(): void {
    this.isRunning = false;
    this.flushBucket();

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.uIOhook) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.uIOhook as any).stop();
      } catch {
        // Ignore stop errors
      }
      this.uIOhook = null;
    }

    capabilities.set("keyboardCount", {
      available: false,
      reason: "Input counter stopped",
      recoverable: true,
    });
    capabilities.set("mouseCount", {
      available: false,
      reason: "Input counter stopped",
      recoverable: true,
    });
  }
}
