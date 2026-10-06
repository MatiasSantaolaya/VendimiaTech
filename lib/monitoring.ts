export interface MonitoringProvider {
  capture(event: { level: "info" | "error"; message: string; context?: Record<string, unknown> }): Promise<void>;
}

export class ConsoleMonitoringProvider implements MonitoringProvider {
  async capture(event: { level: "info" | "error"; message: string }) {
    if (event.level === "error") console.error("[PlanE]", event.message);
  }
}

export class WebhookMonitoringProvider implements MonitoringProvider {
  async capture(event: { level: "info" | "error"; message: string; context?: Record<string, unknown> }) {
    const url = process.env.MONITORING_WEBHOOK_URL;
    if (!url) throw new Error("MONITORING_WEBHOOK_URL is not configured");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`MONITORING_ERROR_${response.status}`);
  }
}

export function createMonitoring(): MonitoringProvider {
  if (process.env.MONITORING_DRIVER === "webhook") return new WebhookMonitoringProvider();
  return new ConsoleMonitoringProvider();
}
