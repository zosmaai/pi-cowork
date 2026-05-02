/**
 * Frontend Telemetry SDK for Zosma Cowork.
 *
 * Wraps Tauri backend commands for anonymous usage tracking.
 * All events are opt-in, no PII, no prompt content, no file paths.
 */

import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Event types matching docs/telemetry-spec.md
// ---------------------------------------------------------------------------

export interface TelemetryProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Send a telemetry event. No-op if telemetry is disabled.
 */
export async function sendEvent(
  eventType: string,
  properties?: TelemetryProperties,
): Promise<void> {
  try {
    await invoke("send_telemetry_event", {
      eventType,
      properties: properties ? JSON.stringify(properties) : null,
    });
  } catch {
    // Non-fatal — never crash the app over telemetry
  }
}

/**
 * Flush pending events to the backend.
 */
export async function flush(): Promise<void> {
  try {
    await invoke("flush_telemetry");
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

/** App was launched (called once on mount). */
export async function trackAppLaunch(properties?: TelemetryProperties): Promise<void> {
  await sendEvent("app_launch", properties);
}

/** A new session was created. */
export async function trackSessionCreated(properties?: TelemetryProperties): Promise<void> {
  await sendEvent("session_created", properties);
}

/** User sent a message. */
export async function trackMessageSent(properties?: TelemetryProperties): Promise<void> {
  await sendEvent("message_sent", properties);
}

/** Stream completed successfully. */
export async function trackStreamComplete(properties?: TelemetryProperties): Promise<void> {
  await sendEvent("stream_complete", properties);
}

/** Stream encountered an error. */
export async function trackStreamError(properties?: TelemetryProperties): Promise<void> {
  await sendEvent("stream_error", properties);
}

/** A feature was used (e.g., file explorer, settings, commands). */
export async function trackFeatureUsed(feature: string, properties?: TelemetryProperties): Promise<void> {
  await sendEvent("feature_used", { feature, ...properties });
}

/** Settings were changed. */
export async function trackSettingsChanged(setting: string, properties?: TelemetryProperties): Promise<void> {
  await sendEvent("settings_changed", { setting, ...properties });
}

// ---------------------------------------------------------------------------
// Crash reporting
// ---------------------------------------------------------------------------

/** Report a crash or unhandled error. */
export async function reportCrash(
  stackTrace: string,
  errorType?: string,
): Promise<void> {
  try {
    await invoke("report_crash", {
      stackTrace,
      errorType: errorType || null,
    });
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

/** Check if telemetry is enabled. */
export async function isEnabled(): Promise<boolean> {
  try {
    return await invoke("telemetry_enabled");
  } catch {
    return false;
  }
}

/** Get the anonymous device ID. */
export async function getDeviceId(): Promise<string> {
  try {
    return await invoke("telemetry_device_id");
  } catch {
    return "unknown";
  }
}

/** Enable or disable telemetry. */
export async function setEnabled(enabled: boolean): Promise<void> {
  try {
    await invoke("telemetry_set_enabled", { enabled });
  } catch {
    // Non-fatal
  }
}

/** Reset device ID (privacy / data deletion). */
export async function resetDeviceId(): Promise<string> {
  try {
    return await invoke("telemetry_reset_device_id");
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Bug reporting helpers
// ---------------------------------------------------------------------------

/** Get the last N lines of app logs (anonymized). */
export async function getAppLogs(lines?: number): Promise<string[]> {
  try {
    return await invoke("get_app_logs", { lines: lines || null });
  } catch {
    return [];
  }
}

/** Generate a pre-filled GitHub issue body with anonymized logs. */
export async function generateBugReport(
  description: string,
  stepsToReproduce?: string,
): Promise<string> {
  const logs = await getAppLogs(50);
  const logSnippet = logs.length > 0 ? logs.join("\n") : "No logs available.";

  let version = "unknown";
  try {
    version = await getVersion();
  } catch {
    // Non-fatal
  }

  return `## Bug Description

${description}

## Steps to Reproduce

${stepsToReproduce || "Not provided."}

## Environment

- Zosma Cowork Version: ${version}
- OS: ${navigator.userAgent}

## Logs (last 50 lines, anonymized)

\`\`\`
${logSnippet}
\`\`\``;
}
