import crypto from "crypto";
import { ApplicationActivity } from "../lib/types";
import { ActiveWindowSample } from "./types";

export type ApplicationActivityCallback = (activity: ApplicationActivity) => void;

export class ActiveWindowManager {
  private currentActivity: ApplicationActivity | null = null;
  private sessionId: string | null = null;
  private onActivity: ApplicationActivityCallback;

  constructor(onActivity: ApplicationActivityCallback) {
    this.onActivity = onActivity;
  }

  public setSessionId(sessionId: string | null): void {
    if (this.sessionId !== sessionId) {
      this.flush();
      this.sessionId = sessionId;
    }
  }

  public handleSample(sample: ActiveWindowSample, isIdle: boolean): void {
    if (!this.sessionId) {
      this.flush();
      return;
    }

    const timestamp = sample.timestamp;

    // Check if matching current activity
    if (
      this.currentActivity &&
      this.currentActivity.sessionId === this.sessionId &&
      this.currentActivity.appName.toLowerCase() === sample.appName.toLowerCase() &&
      this.currentActivity.windowTitle === sample.windowTitle &&
      this.currentActivity.isIdle === isIdle
    ) {
      // Extend current activity
      this.currentActivity.endedAt = timestamp;
      const startMs = new Date(this.currentActivity.startedAt).getTime();
      const endMs = new Date(timestamp).getTime();
      this.currentActivity.durationSeconds = Math.max(
        0,
        Math.round((endMs - startMs) / 1000)
      );
    } else {
      // Flush previous activity
      this.flush();

      // Start new activity
      this.currentActivity = {
        id: crypto.randomUUID(),
        sessionId: this.sessionId,
        appName: sample.appName || "Unknown",
        executableName: sample.executableName,
        windowTitle: sample.windowTitle,
        startedAt: timestamp,
        endedAt: timestamp,
        durationSeconds: 0,
        isIdle,
      };
    }
  }

  public flush(): void {
    if (this.currentActivity && this.currentActivity.durationSeconds > 0) {
      this.onActivity(this.currentActivity);
    }
    this.currentActivity = null;
  }
}
