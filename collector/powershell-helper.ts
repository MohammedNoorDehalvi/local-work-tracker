import { spawn, ChildProcess } from "child_process";
import readline from "readline";
import path from "path";
import { ActiveWindowSample } from "./types";
import { capabilities } from "./capabilities";

export type SampleCallback = (sample: ActiveWindowSample) => void;

export class PowerShellHelperSupervisor {
  private child: ChildProcess | null = null;
  private isRunning = false;
  private scriptPath: string;
  private pollingIntervalMs: number;
  private includeWindowTitle: boolean;
  private onSample: SampleCallback;
  private restartTimeout: NodeJS.Timeout | null = null;
  private backoffDelayMs = 1000;
  private maxBackoffDelayMs = 15000;

  constructor(
    pollingIntervalMs: number,
    includeWindowTitle: boolean,
    onSample: SampleCallback
  ) {
    this.scriptPath = path.resolve(
      process.cwd(),
      "scripts/windows/get-active-window.ps1"
    );
    this.pollingIntervalMs = pollingIntervalMs;
    this.includeWindowTitle = includeWindowTitle;
    this.onSample = onSample;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.spawnHelper();
  }

  public updateConfig(pollingIntervalMs: number, includeWindowTitle: boolean): void {
    const changed =
      this.pollingIntervalMs !== pollingIntervalMs ||
      this.includeWindowTitle !== includeWindowTitle;

    this.pollingIntervalMs = pollingIntervalMs;
    this.includeWindowTitle = includeWindowTitle;

    if (changed && this.isRunning) {
      this.restart();
    }
  }

  public restart(): void {
    this.killChild();
    if (this.isRunning) {
      this.spawnHelper();
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.killChild();
    capabilities.set("activeWindow", {
      available: false,
      reason: "Helper stopped",
      recoverable: true,
    });
    capabilities.set("idleDetection", {
      available: false,
      reason: "Helper stopped",
      recoverable: true,
    });
  }

  private killChild(): void {
    if (this.child) {
      try {
        this.child.kill();
      } catch {
        // Ignore kill errors
      }
      this.child = null;
    }
  }

  private spawnHelper(): void {
    if (!this.isRunning) return;

    try {
      const args = [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.scriptPath,
        "-PollingIntervalMs",
        String(this.pollingIntervalMs),
        "-IncludeWindowTitle",
        this.includeWindowTitle ? "true" : "false",
      ];

      this.child = spawn("powershell.exe", args, {
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      capabilities.set("activeWindow", { available: true });
      capabilities.set("idleDetection", { available: true });
      this.backoffDelayMs = 1000; // Reset backoff on successful spawn

      if (this.child.stdout) {
        const rl = readline.createInterface({
          input: this.child.stdout,
          crlfDelay: Infinity,
        });

        rl.on("line", (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          try {
            const parsed = JSON.parse(trimmed) as ActiveWindowSample;
            if (parsed && typeof parsed.appName === "string") {
              this.onSample(parsed);
            }
          } catch {
            // Ignore malformed line without crashing
          }
        });
      }

      if (this.child.stderr) {
        this.child.stderr.on("data", () => {
          // Internal diagnostics ignored
        });
      }

      this.child.on("exit", (code) => {
        this.child = null;
        if (this.isRunning) {
          capabilities.set("activeWindow", {
            available: false,
            reason: `PowerShell helper exited with code ${code}`,
            recoverable: true,
          });
          capabilities.set("idleDetection", {
            available: false,
            reason: `PowerShell helper exited with code ${code}`,
            recoverable: true,
          });

          // Schedule restart with exponential backoff
          this.restartTimeout = setTimeout(() => {
            this.spawnHelper();
          }, this.backoffDelayMs);

          this.backoffDelayMs = Math.min(
            this.backoffDelayMs * 2,
            this.maxBackoffDelayMs
          );
        }
      });

      this.child.on("error", (err) => {
        capabilities.set("activeWindow", {
          available: false,
          reason: `Failed to spawn helper: ${err.message}`,
          recoverable: true,
        });
        capabilities.set("idleDetection", {
          available: false,
          reason: `Failed to spawn helper: ${err.message}`,
          recoverable: true,
        });
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      capabilities.set("activeWindow", {
        available: false,
        reason: errorMsg,
        recoverable: true,
      });
    }
  }
}
