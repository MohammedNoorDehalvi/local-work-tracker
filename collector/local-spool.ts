import fs from "fs";
import path from "path";
import { IngestBatchPayload, IngestRejectionResponse } from "../lib/types";

export class LocalEventSpool {
  private pendingPath: string;
  private rejectedPath: string;
  private maxSpoolSizeBytes: number;

  constructor(
    pendingPath: string = path.resolve(process.cwd(), "data/pending-events.ndjson"),
    rejectedPath: string = path.resolve(process.cwd(), "data/rejected-events.ndjson"),
    maxSpoolSizeBytes: number = 20 * 1024 * 1024 // 20MB
  ) {
    this.pendingPath = pendingPath;
    this.rejectedPath = rejectedPath;
    this.maxSpoolSizeBytes = maxSpoolSizeBytes;
  }

  /**
   * Appends a batch to pending-events.ndjson
   */
  public enqueueBatch(batch: IngestBatchPayload): void {
    try {
      const dir = path.dirname(this.pendingPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check size limit
      if (fs.existsSync(this.pendingPath)) {
        const stat = fs.statSync(this.pendingPath);
        if (stat.size > this.maxSpoolSizeBytes) {
          console.warn("Spool size limit reached. Discarding oldest batches.");
          this.compactOldest(10);
        }
      }

      const line = JSON.stringify(batch) + "\n";
      fs.appendFileSync(this.pendingPath, line, "utf-8");
    } catch (err) {
      console.error("Failed to enqueue batch to local spool:", err);
    }
  }

  /**
   * Reads all pending batches in chronological order, skipping malformed lines
   */
  public readPendingBatches(): IngestBatchPayload[] {
    if (!fs.existsSync(this.pendingPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.pendingPath, "utf-8");
      const lines = content.split("\n");
      const batches: IngestBatchPayload[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as IngestBatchPayload;
          if (parsed && parsed.batchId && Array.isArray(parsed.events)) {
            batches.push(parsed);
          }
        } catch {
          // Skip corrupted or partially written line
        }
      }

      return batches;
    } catch (err) {
      console.error("Failed to read pending batches:", err);
      return [];
    }
  }

  /**
   * Removes an acknowledged batch by ID and atomically compacts the file
   */
  public acknowledgeBatch(batchId: string): void {
    if (!fs.existsSync(this.pendingPath)) return;

    try {
      const content = fs.readFileSync(this.pendingPath, "utf-8");
      const lines = content.split("\n");
      const remainingLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as IngestBatchPayload;
          if (parsed.batchId !== batchId) {
            remainingLines.push(trimmed);
          }
        } catch {
          // Keep unparseable lines or discard
        }
      }

      const tempPath = `${this.pendingPath}.${Date.now()}.tmp`;
      if (remainingLines.length > 0) {
        fs.writeFileSync(tempPath, remainingLines.join("\n") + "\n", "utf-8");
        fs.renameSync(tempPath, this.pendingPath);
      } else {
        if (fs.existsSync(this.pendingPath)) {
          fs.unlinkSync(this.pendingPath);
        }
      }
    } catch (err) {
      console.error("Failed to acknowledge batch from spool:", err);
    }
  }

  /**
   * Quarantines a permanently unretryable batch into rejected-events.ndjson
   */
  public quarantineBatch(batch: IngestBatchPayload, rejection: IngestRejectionResponse): void {
    try {
      const dir = path.dirname(this.rejectedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Remove from pending spool
      this.acknowledgeBatch(batch.batchId);

      const record = {
        quarantinedAt: new Date().toISOString(),
        rejectionReason: rejection.message,
        rejectionCode: rejection.code,
        batchId: batch.batchId,
        eventCount: batch.events.length,
      };

      fs.appendFileSync(this.rejectedPath, JSON.stringify(record) + "\n", "utf-8");
    } catch (err) {
      console.error("Failed to quarantine batch:", err);
    }
  }

  private compactOldest(batchesToRemove: number): void {
    try {
      const batches = this.readPendingBatches();
      if (batches.length > batchesToRemove) {
        const remaining = batches.slice(batchesToRemove);
        const tempPath = `${this.pendingPath}.${Date.now()}.tmp`;
        const content = remaining.map((b) => JSON.stringify(b)).join("\n") + "\n";
        fs.writeFileSync(tempPath, content, "utf-8");
        fs.renameSync(tempPath, this.pendingPath);
      }
    } catch {
      // Ignore compaction error
    }
  }
}
