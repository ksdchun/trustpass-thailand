import { createHash, randomUUID } from "crypto";

export type TelemetryPayload = Record<string, string | number | boolean | null | string[]>;

type AppInsightsClient = {
  trackEvent: (event: { name: string; properties?: Record<string, unknown> }) => void;
};

let cachedClient: AppInsightsClient | null | undefined;

function getAppInsightsClient(): AppInsightsClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    cachedClient = null;
    return cachedClient;
  }

  try {
    type AppInsightsSetupChain = {
      setAutoCollectConsole: (enabled: boolean) => AppInsightsSetupChain;
      setSendLiveMetrics: (enabled: boolean) => AppInsightsSetupChain;
      start: () => void;
    };

    type AppInsightsModule = {
      setup: (cs: string) => AppInsightsSetupChain;
      defaultClient: AppInsightsClient;
    };

    const appInsights = require("applicationinsights") as AppInsightsModule;
    appInsights.setup(connectionString).setAutoCollectConsole(false).setSendLiveMetrics(false).start();
    cachedClient = appInsights.defaultClient;
    return cachedClient;
  } catch {
    cachedClient = null;
    return cachedClient;
  }
}

export function logEvent(eventName: string, payload: TelemetryPayload): void {
  try {
    const sanitized = sanitizePayload(payload);
    const client = getAppInsightsClient();

    if (client) {
      client.trackEvent({ name: eventName, properties: sanitized });
      return;
    }

    console.log(
      JSON.stringify({
        telemetry_event: eventName,
        timestamp_iso: new Date().toISOString(),
        ...sanitized
      })
    );
  } catch {
    // Telemetry must never break the user request. Swallow all errors.
  }
}

export function hashInput(input: string): string {
  try {
    return createHash("sha256").update(String(input ?? "")).digest("hex");
  } catch {
    return "";
  }
}

export function newRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const REDACTION_PATTERNS: Array<RegExp> = [
  /[A-Z]{1,2}\d{6,9}/g,
  /\b0\d{8,9}\b/g,
  /\+\d{6,15}/g,
  /\S+@\S+\.\S+/g,
  /\b\d{1}-\d{4}-\d{5}-\d{2}-\d{1}\b/g
];

export function redactPII(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text ?? "";
  let result = text;
  for (const pattern of REDACTION_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

function sanitizePayload(payload: TelemetryPayload): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
      continue;
    }
    if (typeof value === "string") {
      sanitized[key] = redactPII(value);
      continue;
    }
    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => (typeof item === "string" ? redactPII(item) : item));
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
