export type Severity = "error" | "warning" | "info";

export interface HealthCheck {
  /** Stable identifier — used as localStorage key suffix */
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  passed: boolean;
}
