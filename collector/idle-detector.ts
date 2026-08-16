import crypto from "crypto";
import { IdlePeriod } from "../lib/types";

export type IdlePeriodCallback = (period: IdlePeriod) => void;

export class IdleDetector {
  private idleThresholdSeconds: number;
  private isCurrentlyIdle = false;
  private idleStartedAt: string | null = null;
  private sessionId: string | null = null;
  private onIdlePeriod: IdlePeriodCallback;

  constructor(
    idleThresholdSeconds: number,
    onIdlePeriod: IdlePeriodCallback
  ) {
    this.idleThresholdSeconds = idleThresholdSeconds;
    this.onIdlePeriod = onIdlePeriod;
  }

  public setThreshold(thresholdSeconds: number): void {
    this.idleThresholdSeconds = thresholdSeconds;
  }

  public setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  public isIdle(): boolean {
    return this.isCurrentlyIdle;
  }

  public updateSample(idleSeconds: number, timestamp: string): void {
    if (!this.sessionId) {
      this.isCurrentlyIdle = false;
      this.idleStartedAt = null;
      return;
    }

    if (idleSeconds >= this.idleThresholdSeconds) {
      if (!this.isCurrentlyIdle) {
        // Transitioned to Idle
        this.isCurrentlyIdle = true;
        // The idle period actually started `idleSeconds` ago
        const startTimeMs = new Date(timestamp).getTime() - idleSeconds * 1000;
        this.idleStartedAt = new Date(startTimeMs).toISOString();
      }
    } else {
      if (this.isCurrentlyIdle && this.idleStartedAt) {
        // Transitioned back to Active from Idle
        const endedAt = timestamp;
        const startMs = new Date(this.idleStartedAt).getTime();
        const endMs = new Date(endedAt).getTime();
        const durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));

        if (durationSeconds > 0) {
          this.onIdlePeriod({
            id: crypto.randomUUID(),
            sessionId: this.sessionId,
            startedAt: this.idleStartedAt,
            endedAt,
            durationSeconds,
          });
        }

        this.isCurrentlyIdle = false;
        this.idleStartedAt = null;
      }
    }
  }

  public flush(timestamp: string = new Date().toISOString()): void {
    if (this.isCurrentlyIdle && this.idleStartedAt && this.sessionId) {
      const endedAt = timestamp;
      const startMs = new Date(this.idleStartedAt).getTime();
      const endMs = new Date(endedAt).getTime();
      const durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));

      if (durationSeconds > 0) {
        this.onIdlePeriod({
          id: crypto.randomUUID(),
          sessionId: this.sessionId,
          startedAt: this.idleStartedAt,
          endedAt,
          durationSeconds,
        });
      }

      this.isCurrentlyIdle = false;
      this.idleStartedAt = null;
    }
  }
}
