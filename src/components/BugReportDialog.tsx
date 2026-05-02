import { generateBugReport } from "@/lib/telemetry";
import { Bug, CheckCircle, Clipboard, Loader2, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function BugReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!title.trim() || !description.trim()) return;
    setGenerating(true);
    setGenerated(null);
    try {
      const report = await generateBugReport(title.trim(), description.trim());
      setGenerated(report);
    } catch (err) {
      console.error("[cowork] Failed to generate bug report:", err);
    } finally {
      setGenerating(false);
    }
  }, [title, description]);

  const handleCopy = useCallback(() => {
    if (!generated) return;
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generated]);

  const handleClose = useCallback(() => {
    setTitle("");
    setDescription("");
    setGenerated(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setGenerated(null);
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-lg rounded-xl border bg-card shadow-lg mx-4"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-semibold text-foreground">Report a Bug</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!generated ? (
            <>
              <p className="text-xs text-muted-foreground">
                Describe what went wrong. A pre-filled GitHub issue template will be generated with your report and anonymized system info.
              </p>

              {/* Title */}
              <div>
                <label htmlFor="bug-title" className="text-xs font-medium text-foreground mb-1 block">
                  Summary
                </label>
                <input
                  id="bug-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the bug"
                  className="w-full text-sm rounded-lg border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="bug-desc" className="text-xs font-medium text-foreground mb-1 block">
                  Details
                </label>
                <textarea
                  id="bug-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Steps to reproduce, expected behavior, actual behavior..."
                  rows={4}
                  className="w-full text-sm rounded-lg border bg-background px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!title.trim() || !description.trim() || generating}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated report */}
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Report generated
              </div>

              <textarea
                readOnly
                value={generated}
                rows={10}
                className="w-full text-xs font-mono rounded-lg border bg-muted px-3 py-2 text-foreground resize-none focus:outline-none"
                style={{ borderColor: "hsl(var(--border))" }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setGenerated(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  New Report
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Paste this into a new GitHub issue at{" "}
                <a
                  href="https://github.com/zosmaai/zosma-cowork/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  zosmaai/zosma-cowork/issues
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
