/**
 * Opt-in telemetry consent dialog.
 *
 * Shown once on first launch when telemetry is not yet configured.
 * Uses a centered modal overlay with clear privacy messaging.
 */

import { useState } from "react";
import { setEnabled, trackFeatureUsed } from "@/lib/telemetry";

interface TelemetryDialogProps {
  /** Called when the user makes a choice (dismisses the dialog). */
  onDecided?: () => void;
}

export function TelemetryDialog({ onDecided }: TelemetryDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleChoose(accept: boolean) {
    setPending(true);
    try {
      await setEnabled(accept);
      if (accept) {
        // This event itself is the first tracked event — meta but useful
        await trackFeatureUsed("telemetry_consent", { accepted: true });
      }
    } catch {
      // Non-fatal
    } finally {
      setPending(false);
      onDecided?.();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-background p-8 shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="text-3xl flex-shrink-0">📊</div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Help Improve Zosma Cowork</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Send anonymous usage data so we can fix bugs and prioritize features.{" "}
              <strong>We never collect your prompts, responses, or personal information.</strong>
            </p>
          </div>
        </div>

        {/* What we track */}
        <div className="rounded-xl bg-muted/50 p-4 mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">What we track:</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              App launches and active sessions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Message counts and stream completion status
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Error types and crash reports (stack traces only)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Feature usage (settings, file explorer, commands)
            </li>
          </ul>

          <h3 className="text-sm font-medium text-foreground mb-2 mt-4">What we don&apos;t track:</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✗</span>
              Your messages, prompts, or AI responses
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✗</span>
              File contents, file paths, or project names
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✗</span>
              API keys, auth tokens, or account details
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✗</span>
              Personal identifiers (name, email, IP)
            </li>
          </ul>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          You can change this anytime in{" "}
          <span className="font-medium text-foreground">Settings &gt; Privacy</span>.
          Your data is stored on our servers and aggregated for analytics.
          The telemetry backend is documented in our open-source repository.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleChoose(false)}
            disabled={pending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors text-sm font-medium disabled:opacity-50"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={() => handleChoose(true)}
            disabled={pending}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Saving..." : "Enable Telemetry"}
          </button>
        </div>
      </div>
    </div>
  );
}
