import { Sentry } from "@/services/monitoring";

export type TelemetryEvent =
  | { name: "screen_view"; route: string }
  | { name: "diagnosis_started"; imageCount: number; hasDescription: boolean }
  | { name: "diagnosis_outcome"; outcome: "diagnosis" | "needs_evidence" | "needs_clarification" | "unsupported" | "failed"; safetyLevel?: string }
  | { name: "repair_started" }
  | { name: "repair_completed"; fixed: boolean }
  | { name: "appliance_added"; method: "scan" | "manual" }
  | { name: "paywall_opened"; source: string }
  | { name: "purchase_outcome"; outcome: "activated" | "cancelled" | "failed" | "restored" }
  | { name: "account_deleted" };

export interface TelemetrySink { track(event: TelemetryEvent): void }

class PrivacyFilteredTelemetry implements TelemetrySink {
  track(event: TelemetryEvent) {
    Sentry.addBreadcrumb({ category: "product", level: "info", message: event.name, data: Object.fromEntries(Object.entries(event).filter(([key]) => key !== "name")) });
  }
}

export const telemetry: TelemetrySink = new PrivacyFilteredTelemetry();
