import { CollectorCapabilities, CapabilityStatus } from "../lib/types";

class CapabilitiesRegistry {
  private capabilities: CollectorCapabilities = {
    activeWindow: { available: false, reason: "Initializing", recoverable: true },
    idleDetection: { available: false, reason: "Initializing", recoverable: true },
    keyboardCount: { available: false, reason: "Initializing", recoverable: true },
    mouseCount: { available: false, reason: "Initializing", recoverable: true },
    fileMonitoring: { available: false, reason: "Initializing", recoverable: true },
  };

  public set(key: keyof CollectorCapabilities, status: CapabilityStatus): void {
    this.capabilities[key] = status;
  }

  public get(): CollectorCapabilities {
    return { ...this.capabilities };
  }
}

export const capabilities = new CapabilitiesRegistry();
