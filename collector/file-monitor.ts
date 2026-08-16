import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import crypto from "crypto";
import { FileActivity, FileEventType } from "../lib/types";
import { capabilities } from "./capabilities";

export type FileActivityCallback = (activity: FileActivity) => void;

export class FileMonitor {
  private watcher: FSWatcher | null = null;
  private monitoredFolders: string[] = [];
  private storeFullFilePaths: boolean;
  private pathHashSalt: string;
  private sessionId: string | null = null;
  private onFileActivity: FileActivityCallback;

  constructor(
    storeFullFilePaths: boolean,
    pathHashSalt: string,
    onFileActivity: FileActivityCallback
  ) {
    this.storeFullFilePaths = storeFullFilePaths;
    this.pathHashSalt = pathHashSalt;
    this.onFileActivity = onFileActivity;
  }

  public setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  public updateConfig(
    folders: string[],
    storeFullFilePaths: boolean,
    pathHashSalt: string
  ): void {
    const foldersChanged =
      JSON.stringify(this.monitoredFolders.slice().sort()) !==
      JSON.stringify(folders.slice().sort());

    this.storeFullFilePaths = storeFullFilePaths;
    this.pathHashSalt = pathHashSalt;

    if (foldersChanged) {
      this.monitoredFolders = [...folders];
      this.restartWatcher();
    }
  }

  public start(): void {
    this.restartWatcher();
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    capabilities.set("fileMonitoring", {
      available: false,
      reason: "File monitor stopped",
      recoverable: true,
    });
  }

  private restartWatcher(): void {
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }

    if (this.monitoredFolders.length === 0) {
      capabilities.set("fileMonitoring", {
        available: true,
      });
      return;
    }

    try {
      this.watcher = chokidar.watch(this.monitoredFolders, {
        ignoreInitial: true,
        persistent: true,
        depth: 5,
        ignored: [
          /(^|[/\\])\../, // ignore dotfiles
          "**/node_modules/**",
          "**/.git/**",
        ],
      });

      this.watcher.on("add", (filePath) => this.handleEvent("create", filePath));
      this.watcher.on("change", (filePath) => this.handleEvent("modify", filePath));
      this.watcher.on("unlink", (filePath) => this.handleEvent("delete", filePath));

      this.watcher.on("error", (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        capabilities.set("fileMonitoring", {
          available: false,
          reason: `Watcher error: ${errorMsg}`,
          recoverable: true,
        });
      });

      capabilities.set("fileMonitoring", { available: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      capabilities.set("fileMonitoring", {
        available: false,
        reason: `Failed to watch folders: ${msg}`,
        recoverable: true,
      });
    }
  }

  private sanitizeDirectory(dirPath: string): string {
    if (this.storeFullFilePaths) {
      return dirPath;
    }
    // Hash directory path using salt for privacy
    const hash = crypto
      .createHmac("sha256", this.pathHashSalt)
      .update(dirPath)
      .digest("hex")
      .slice(0, 12);
    const basename = path.basename(dirPath);
    return `${basename}#${hash}`;
  }

  private handleEvent(eventType: FileEventType, filePath: string): void {
    if (!this.sessionId) return;

    try {
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).replace(/^\./, "");
      const dir = this.sanitizeDirectory(path.dirname(filePath));

      const activity: FileActivity = {
        id: crypto.randomUUID(),
        sessionId: this.sessionId,
        fileName,
        fileExtension: ext,
        parentDirectory: dir,
        eventType,
        timestamp: new Date().toISOString(),
      };

      this.onFileActivity(activity);
    } catch {
      // Ignore file event error
    }
  }
}
