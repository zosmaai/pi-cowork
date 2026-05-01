//! CoworkEvent — stable event types matching the frontend PiEvent taxonomy.
//!
//! The SDK (`pi_agent_rust`) emits `AgentEvent` internally. We translate those
//! into `CoworkEvent` so the Tauri channel delivers exactly what the React
//! frontend expects (snake-case tags, camelCase fields).
//!
//! This module is intentionally independent of Tauri — it's pure Rust + serde.

use pi::sdk::{Message, ToolOutput};
use serde::{Deserialize, Serialize};

/// Session header event emitted at the start of every session.
///
/// The SDK does not emit this; the engine synthesizes it when a session is
/// created so the frontend can display session metadata immediately.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoworkSessionEvent {
    pub version: u32,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub timestamp: String,
    #[serde(rename = "cwd")]
    pub working_directory: String,
}

// ---------------------------------------------------------------------------
// Structured error payload
// ---------------------------------------------------------------------------

/// Structured error payload sent to the frontend.
///
/// Carries both a user-friendly message and machine-readable fields so the
/// frontend can display rich error cards and suggest appropriate actions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoworkErrorPayload {
    /// User-friendly error message.
    pub message: String,

    /// Raw SDK/backend error for debugging.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,

    /// Provider that generated the error, if known.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Model that generated the error, if known.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Error category code for the frontend to make decisions.
    /// Known codes: provider_error, model_unavailable, connection_refused,
    /// authentication, rate_limited, timeout, internal, session_not_found.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Whether a retry with a different model might resolve this error.
    /// The frontend uses this to offer a "try different model" action.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub retryable: bool,
}

impl CoworkErrorPayload {
    /// Create a minimal error payload from just a message string.
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            details: None,
            provider: None,
            model: None,
            code: None,
            retryable: false,
        }
    }

    /// Set the raw error details (for debugging).
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    /// Set the provider context.
    pub fn with_provider(mut self, provider: impl Into<String>) -> Self {
        self.provider = Some(provider.into());
        self
    }

    /// Set the model context.
    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    /// Set the error category code.
    pub fn with_code(mut self, code: impl Into<String>) -> Self {
        self.code = Some(code.into());
        self
    }

    /// Mark the error as retryable (may succeed with a different model).
    pub fn retryable(mut self) -> Self {
        self.retryable = true;
        self
    }
}

// ---------------------------------------------------------------------------
// Event enum
// ---------------------------------------------------------------------------

/// Unified event type sent over the Tauri channel to the frontend.
///
/// Each variant serializes with a `"type"` tag using snake_case — matching
/// the `PiEvent` union in `src/types/pi-events.ts`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CoworkEvent {
    /// Synthesized at session creation.
    Session(CoworkSessionEvent),

    /// Agent lifecycle start.
    AgentStart,

    /// Agent lifecycle end (success).
    AgentEnd { messages: Vec<Message> },

    /// Turn lifecycle start.
    TurnStart,

    /// Turn lifecycle end.
    TurnEnd {
        message: Message,
        #[serde(rename = "toolResults")]
        tool_results: Vec<Message>,
    },

    /// Message lifecycle start.
    MessageStart { message: Message },

    /// Message update (assistant streaming).
    ///
    /// The `assistant_message_event` is stored as a raw JSON value because
    /// the SDK's `AssistantMessageEvent` enum is not re-exported publicly.
    /// This preserves the exact shape the frontend expects (type-tagged object).
    MessageUpdate {
        message: Message,
        #[serde(rename = "assistantMessageEvent")]
        assistant_message_event: serde_json::Value,
    },

    /// Message lifecycle end.
    MessageEnd { message: Message },

    /// Tool execution start.
    ToolExecutionStart {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        args: serde_json::Value,
    },

    /// Tool execution update (partial result).
    ToolExecutionUpdate {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        args: serde_json::Value,
        #[serde(rename = "partialResult")]
        partial_result: CoworkToolOutput,
    },

    /// Tool execution end.
    ToolExecutionEnd {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        result: CoworkToolOutput,
        #[serde(rename = "isError")]
        is_error: bool,
    },

    /// Queue / steering update.
    QueueUpdate {
        steering: Vec<String>,
        follow_up: Vec<String>,
    },

    /// Auto-compaction start.
    CompactionStart { reason: String },

    /// Auto-compaction end.
    CompactionEnd {
        reason: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        result: Option<serde_json::Value>,
        aborted: bool,
        #[serde(rename = "willRetry")]
        will_retry: bool,
        #[serde(rename = "errorMessage", skip_serializing_if = "Option::is_none")]
        error_message: Option<String>,
    },

    /// Auto-retry start.
    AutoRetryStart {
        attempt: u32,
        #[serde(rename = "maxAttempts")]
        max_attempts: u32,
        #[serde(rename = "delayMs")]
        delay_ms: u64,
        #[serde(rename = "errorMessage")]
        error_message: String,
    },

    /// Auto-retry end.
    AutoRetryEnd {
        success: bool,
        attempt: u32,
        #[serde(rename = "finalError", skip_serializing_if = "Option::is_none")]
        final_error: Option<String>,
    },

    /// Streaming complete (synthesized from AgentEnd without error).
    Done,

    /// Error event with structured payload.
    ///
    /// Serializes as `{"type":"error", "message":"...", "details":..., ...}`.
    /// Legacy clients that only read `message` will still work — the new
    /// fields are all optional and skipped when None.
    Error(CoworkErrorPayload),
}

// ---------------------------------------------------------------------------
// Tool output types
// ---------------------------------------------------------------------------

/// Simplified tool output for JSON serialization over the Tauri channel.
///
/// The SDK's `ToolOutput` contains `Vec<ContentBlock>` which serializes with
/// extra nesting. We flatten to a simple content array matching what the
/// frontend expects: `{ content: [{ type, text }] }`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoworkToolOutput {
    pub content: Vec<CoworkContentBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

/// Minimal content block for tool output serialization.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CoworkContentBlock {
    Text { text: String },
    Thinking { thinking: String },
    Image { source: CoworkImageSource },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoworkImageSource {
    #[serde(rename = "type")]
    source_type: String,
    #[serde(rename = "mediaType")]
    media_type: String,
    data: String,
}

impl CoworkToolOutput {
    /// Convert from the SDK's `ToolOutput`.
    pub fn from_tool_output(output: &ToolOutput) -> Self {
        let content = output
            .content
            .iter()
            .map(|block| match block {
                pi::sdk::ContentBlock::Text(t) => CoworkContentBlock::Text {
                    text: t.text.clone(),
                },
                pi::sdk::ContentBlock::Thinking(t) => CoworkContentBlock::Thinking {
                    thinking: t.thinking.clone(),
                },
                pi::sdk::ContentBlock::Image(img) => CoworkContentBlock::Image {
                    source: CoworkImageSource {
                        source_type: "base64".to_string(),
                        media_type: img.mime_type.clone(),
                        data: img.data.clone(),
                    },
                },
                pi::sdk::ContentBlock::ToolCall(_) => {
                    // Tool calls in tool output are unusual; skip.
                    CoworkContentBlock::Text {
                        text: String::new(),
                    }
                }
            })
            .collect();
        Self {
            content,
            details: output.details.clone(),
        }
    }
}

// ============================================================================
// Translation from SDK AgentEvent → CoworkEvent
// ============================================================================

/// Translate a single SDK `AgentEvent` into a `CoworkEvent`.
///
/// Returns `None` for events the frontend doesn't need (e.g. extension errors).
pub fn agent_event_to_cowork(event: &pi::sdk::AgentEvent) -> Option<CoworkEvent> {
    use pi::sdk::AgentEvent;

    match event {
        AgentEvent::AgentStart { .. } => Some(CoworkEvent::AgentStart),

        AgentEvent::AgentEnd {
            messages,
            error: None,
            ..
        } => Some(CoworkEvent::AgentEnd {
            messages: messages.clone(),
        }),

        AgentEvent::AgentEnd {
            error: Some(msg), ..
        } => Some(CoworkEvent::Error(CoworkErrorPayload::new(msg))),

        AgentEvent::TurnStart { .. } => Some(CoworkEvent::TurnStart),

        AgentEvent::TurnEnd {
            message,
            tool_results,
            ..
        } => Some(CoworkEvent::TurnEnd {
            message: message.clone(),
            tool_results: tool_results.clone(),
        }),

        AgentEvent::MessageStart { message } => Some(CoworkEvent::MessageStart {
            message: message.clone(),
        }),

        AgentEvent::MessageUpdate { message, .. } => {
            let event_json = serde_json::to_value(event).ok()?;
            let ame = event_json
                .get("assistantMessageEvent")
                .cloned()
                .unwrap_or_default();
            Some(CoworkEvent::MessageUpdate {
                message: message.clone(),
                assistant_message_event: ame,
            })
        }

        AgentEvent::MessageEnd { message } => Some(CoworkEvent::MessageEnd {
            message: message.clone(),
        }),

        AgentEvent::ToolExecutionStart {
            tool_call_id,
            tool_name,
            args,
            ..
        } => Some(CoworkEvent::ToolExecutionStart {
            tool_call_id: tool_call_id.clone(),
            tool_name: tool_name.clone(),
            args: args.clone(),
        }),

        AgentEvent::ToolExecutionUpdate {
            tool_call_id,
            tool_name,
            args,
            partial_result,
            ..
        } => Some(CoworkEvent::ToolExecutionUpdate {
            tool_call_id: tool_call_id.clone(),
            tool_name: tool_name.clone(),
            args: args.clone(),
            partial_result: CoworkToolOutput::from_tool_output(partial_result),
        }),

        AgentEvent::ToolExecutionEnd {
            tool_call_id,
            tool_name,
            result,
            is_error,
            ..
        } => Some(CoworkEvent::ToolExecutionEnd {
            tool_call_id: tool_call_id.clone(),
            tool_name: tool_name.clone(),
            result: CoworkToolOutput::from_tool_output(result),
            is_error: *is_error,
        }),

        AgentEvent::AutoCompactionStart { reason, .. } => Some(CoworkEvent::CompactionStart {
            reason: reason.clone(),
        }),

        AgentEvent::AutoCompactionEnd {
            result,
            aborted,
            will_retry,
            error_message,
            ..
        } => Some(CoworkEvent::CompactionEnd {
            reason: "auto".to_string(),
            result: result.clone(),
            aborted: *aborted,
            will_retry: *will_retry,
            error_message: error_message.clone(),
        }),

        AgentEvent::AutoRetryStart {
            attempt,
            max_attempts,
            delay_ms,
            error_message,
            ..
        } => Some(CoworkEvent::AutoRetryStart {
            attempt: *attempt,
            max_attempts: *max_attempts,
            delay_ms: *delay_ms,
            error_message: error_message.clone(),
        }),

        AgentEvent::AutoRetryEnd {
            success,
            attempt,
            final_error,
            ..
        } => Some(CoworkEvent::AutoRetryEnd {
            success: *success,
            attempt: *attempt,
            final_error: final_error.clone(),
        }),

        // Extension errors are internal — frontend doesn't need them.
        AgentEvent::ExtensionError { .. } => None,
    }
}

// ============================================================================
// Error parsing helpers
// ============================================================================

/// Categorize an engine error string and produce a structured `CoworkErrorPayload`.
///
/// Parses common SDK error patterns to extract:
/// - Which provider/model failed
/// - What category of error (provider, connection, auth, rate limit, etc.)
/// - Whether retrying with a different model would help
pub fn categorize_engine_error(error: &str) -> CoworkErrorPayload {
    let lower = error.to_lowercase();

    // Extract provider name from "Provider error: <name>: ..."
    let provider = extract_provider(error);
    // Extract model name — typically after "Model Group="
    let model = extract_model(error);

    // Determine error category.
    // Order matters: check more specific patterns BEFORE "provider error"
    // since many errors (connection refused, auth, timeout) appear within
    // a Provider error wrapper.
    let (code, retryable, friendly_message) = if lower.contains("connection refused") || lower.contains("connection error") {
        ("connection_refused", false, format!(
            "Could not connect to {}. Make sure the provider is running and accessible.",
            provider.as_deref().unwrap_or("your provider")
        ))
    } else if lower.contains("401") || lower.contains("unauthorized") || lower.contains("authentication") {
        ("authentication", false, "Authentication failed. Check your API key.".to_string())
    } else if lower.contains("429") || lower.contains("rate limit") {
        ("rate_limited", true, "You've been rate limited. Please wait a moment and try again.".to_string())
    } else if lower.contains("timeout") || lower.contains("timed out") {
        ("timeout", true, "The request timed out. The provider might be overloaded.".to_string())
    } else if (lower.contains("model") && lower.contains("not found")) || lower.contains("model unavailable") {
        ("model_unavailable", true, format!(
            "Model '{}' is not available on {}. Try selecting a different model.",
            model.as_deref().unwrap_or("unknown"),
            provider.as_deref().unwrap_or("your provider")
        ))
    } else if lower.contains("provider error") {
        ("provider_error", true, format!(
            "{} is returning errors. The model might not be running or the provider may be down.",
            provider.as_deref().unwrap_or("Your provider")
        ))
    } else if lower.contains("session not found") {
        ("session_not_found", false, "Session not found. Please try creating a new session.".to_string())
    } else {
        ("internal", false, format!(
            "An unexpected error occurred: {}",
            truncate_message(error, 120)
        ))
    };

    let mut payload = CoworkErrorPayload::new(friendly_message)
        .with_details(error)
        .with_code(code);

    if retryable {
        payload = payload.retryable();
    }
    if let Some(p) = provider {
        payload = payload.with_provider(p);
    }
    if let Some(m) = model {
        payload = payload.with_model(m);
    }

    payload
}

/// Extract provider name from an error like "Provider error: local-qwen: ..."
fn extract_provider(error: &str) -> Option<String> {
    // Pattern: "Provider error: <name>:" or "provider <name>" 
    if let Some(idx) = error.find("Provider error: ") {
        let rest = &error[idx + "Provider error: ".len()..];
        if let Some(end) = rest.find(':') {
            return Some(rest[..end].trim().to_string());
        }
    }
    None
}

/// Extract model name from patterns like "Model Group=<name>" or "model '<name>'"
fn extract_model(error: &str) -> Option<String> {
    // Pattern: "Model Group=<name>" (LiteLLM style)
    if let Some(idx) = error.find("Model Group=") {
        let rest = &error[idx + "Model Group=".len()..];
        let end = rest.find(|c: char| c.is_whitespace() || c == ',' || c == '\n').unwrap_or(rest.len());
        return Some(rest[..end].trim().to_string());
    }
    // Pattern: model '<name>' not found
    if let Some(idx) = error.find("model '") {
        let rest = &error[idx + "model '".len()..];
        if let Some(end) = rest.find('\'') {
            return Some(rest[..end].trim().to_string());
        }
    }
    None
}

/// Truncate a message to `max_len` chars, appending "..." if truncated.
fn truncate_message(msg: &str, max_len: usize) -> String {
    if msg.len() <= max_len {
        msg.to_string()
    } else {
        format!("{}...", &msg[..max_len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Serialization tests
    // -----------------------------------------------------------------------

    #[test]
    fn cowork_event_serializes_with_snake_case_tag() {
        let event = CoworkEvent::AgentStart;
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"agent_start""#));
    }

    #[test]
    fn cowork_event_tool_execution_start_has_camel_case_fields() {
        let event = CoworkEvent::ToolExecutionStart {
            tool_call_id: "tc-1".to_string(),
            tool_name: "bash".to_string(),
            args: serde_json::json!({"command": "ls"}),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"tool_execution_start""#));
        assert!(json.contains(r#""toolCallId":"tc-1""#));
        assert!(json.contains(r#""toolName":"bash""#));
    }

    #[test]
    fn cowork_event_tool_execution_end_serializes_correctly() {
        let output = CoworkToolOutput {
            content: vec![CoworkContentBlock::Text {
                text: "done".to_string(),
            }],
            details: None,
        };
        let event = CoworkEvent::ToolExecutionEnd {
            tool_call_id: "tc-2".to_string(),
            tool_name: "read".to_string(),
            result: output,
            is_error: false,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""isError":false"#));
        assert!(json.contains(r#""toolCallId":"tc-2""#));
    }

    #[test]
    fn cowork_event_error_serializes_with_message() {
        let event = CoworkEvent::Error(CoworkErrorPayload::new("something broke"));
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"error""#));
        assert!(json.contains(r#""message":"something broke""#));
    }

    #[test]
    fn cowork_event_error_with_all_fields() {
        let event = CoworkEvent::Error(
            CoworkErrorPayload::new("Provider error")
                .with_details("HTTP 500: Internal Server Error")
                .with_provider("local-qwen")
                .with_model("gemma-4-E4B-it")
                .with_code("provider_error")
                .retryable(),
        );
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""message":"Provider error""#));
        assert!(json.contains(r#""details":"HTTP 500: Internal Server Error""#));
        assert!(json.contains(r#""provider":"local-qwen""#));
        assert!(json.contains(r#""model":"gemma-4-E4B-it""#));
        assert!(json.contains(r#""code":"provider_error""#));
        assert!(json.contains(r#""retryable":true"#));
    }

    #[test]
    fn cowork_event_error_omits_optional_fields_when_none() {
        let event = CoworkEvent::Error(CoworkErrorPayload::new("minimal"));
        let json = serde_json::to_string(&event).unwrap();
        assert!(!json.contains("details"));
        assert!(!json.contains("provider"));
        assert!(!json.contains("model"));
        assert!(!json.contains("code"));
        assert!(!json.contains(r#""retryable"#));  // retryable=false is skipped by skip_serializing_if
    }

    #[test]
    fn cowork_event_done_serializes() {
        let event = CoworkEvent::Done;
        let json = serde_json::to_string(&event).unwrap();
        assert_eq!(json, r#"{"type":"done"}"#);
    }

    #[test]
    fn cowork_event_session_serializes() {
        let event = CoworkEvent::Session(CoworkSessionEvent {
            version: 1,
            session_id: "abc-123".to_string(),
            timestamp: "2026-04-30T00:00:00Z".to_string(),
            working_directory: "/home/user/project".to_string(),
        });
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"session""#));
        assert!(json.contains(r#""sessionId":"abc-123""#));
    }

    #[test]
    fn cowork_event_error_deserializes_message_for_legacy_compat() {
        let json = r#"{"type":"error","message":"something broke"}"#;
        let parsed: CoworkEvent = serde_json::from_str(json).unwrap();
        match parsed {
            CoworkEvent::Error(payload) => {
                assert_eq!(payload.message, "something broke");
                assert!(payload.details.is_none());
                assert!(payload.provider.is_none());
            }
            _ => panic!("expected Error variant"),
        }
    }

    // -----------------------------------------------------------------------
    // CoworkToolOutput tests
    // -----------------------------------------------------------------------

    #[test]
    fn cowork_tool_output_from_sdk_flattens_content() {
        let tool_output = ToolOutput {
            content: vec![pi::sdk::ContentBlock::Text(pi::sdk::TextContent::new(
                "hello",
            ))],
            details: None,
            is_error: false,
        };
        let cowork = CoworkToolOutput::from_tool_output(&tool_output);
        assert_eq!(cowork.content.len(), 1);
        match &cowork.content[0] {
            CoworkContentBlock::Text { text } => assert_eq!(text, "hello"),
            _ => panic!("expected Text block"),
        }
    }

    // -----------------------------------------------------------------------
    // agent_event_to_cowork translation tests
    // -----------------------------------------------------------------------

    #[test]
    fn agent_event_to_cowork_translates_agent_start() {
        use pi::sdk::AgentEvent;
        let event = AgentEvent::AgentStart {
            session_id: "test".into(),
        };
        let result = agent_event_to_cowork(&event).unwrap();
        match result {
            CoworkEvent::AgentStart => {} // OK
            _ => panic!("expected AgentStart"),
        }
    }

    #[test]
    fn agent_event_to_cowork_translates_agent_end_success() {
        use pi::sdk::AgentEvent;
        let event = AgentEvent::AgentEnd {
            session_id: "test".into(),
            messages: vec![],
            error: None,
        };
        let result = agent_event_to_cowork(&event).unwrap();
        match result {
            CoworkEvent::AgentEnd { .. } => {} // OK
            _ => panic!("expected AgentEnd"),
        }
    }

    #[test]
    fn agent_event_to_cowork_translates_agent_end_error() {
        use pi::sdk::AgentEvent;
        let event = AgentEvent::AgentEnd {
            session_id: "test".into(),
            messages: vec![],
            error: Some("something broke".to_string()),
        };
        let result = agent_event_to_cowork(&event).unwrap();
        match result {
            CoworkEvent::Error(payload) => assert_eq!(payload.message, "something broke"),
            _ => panic!("expected Error variant"),
        }
    }

    #[test]
    fn agent_event_to_cowork_ignores_extension_errors() {
        use pi::sdk::AgentEvent;
        let event = AgentEvent::ExtensionError {
            extension_id: Some("ext-1".to_string()),
            event: "on_prompt".to_string(),
            error: "internal".to_string(),
        };
        assert!(agent_event_to_cowork(&event).is_none());
    }

    // -----------------------------------------------------------------------
    // Error categorization tests
    // -----------------------------------------------------------------------

    #[test]
    fn categorize_provider_error() {
        let err = "SDK error: Provider error: local-qwen: OpenAI API error (HTTP 500): Internal Server Error. Received Model Group=unsloth/gemma-4-E4B-it";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("provider_error"));
        assert_eq!(payload.provider.as_deref(), Some("local-qwen"));
        assert_eq!(payload.model.as_deref(), Some("unsloth/gemma-4-E4B-it"));
        assert!(payload.retryable);
        assert!(payload.message.contains("returning errors"));
    }

    #[test]
    fn categorize_connection_refused() {
        let err = "SDK error: Provider error: ollama: Connection refused (os error 111)";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("connection_refused"));
        assert_eq!(payload.provider.as_deref(), Some("ollama"));
        assert!(!payload.retryable);
        assert!(payload.message.contains("Could not connect"));
    }

    #[test]
    fn categorize_rate_limited() {
        let err = "Provider error: openai: 429 Too Many Requests";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("rate_limited"));
        assert!(payload.retryable);
        assert!(payload.message.contains("rate limited"));
    }

    #[test]
    fn categorize_timeout() {
        let err = "Provider error: anthropic: Request timed out after 60s";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("timeout"));
        assert!(payload.retryable);
        assert!(payload.message.contains("timed out"));
    }

    #[test]
    fn categorize_unknown_error_falls_back_to_internal() {
        let err = "Something completely unexpected happened";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("internal"));
        assert!(!payload.retryable);
        assert!(payload.message.contains("unexpected"));
    }

    #[test]
    fn categorize_session_not_found() {
        let err = "session not found: abc-123";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("session_not_found"));
        assert!(!payload.retryable);
    }

    #[test]
    fn categorize_authentication_error() {
        let err = "Provider error: openai: 401 Invalid API key";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("authentication"));
        assert!(!payload.retryable);
        assert!(payload.message.contains("API key"));
    }

    #[test]
    fn categorize_model_unavailable() {
        let err = "model 'gpt-5' not found on provider openai";
        let payload = categorize_engine_error(err);
        assert_eq!(payload.code.as_deref(), Some("model_unavailable"));
        assert_eq!(payload.model.as_deref(), Some("gpt-5"));
        assert!(payload.retryable);
    }

    #[test]
    fn extract_provider_from_standard_format() {
        let result = extract_provider("SDK error: Provider error: local-qwen: something failed");
        assert_eq!(result, Some("local-qwen".to_string()));
    }

    #[test]
    fn extract_provider_returns_none_when_not_found() {
        let result = extract_provider("random error message");
        assert_eq!(result, None);
    }

    #[test]
    fn extract_model_from_litellm_group() {
        let result = extract_model("Received Model Group=unsloth/gemma-4-E4B-it");
        assert_eq!(result, Some("unsloth/gemma-4-E4B-it".to_string()));
    }

    #[test]
    fn extract_model_from_single_quotes() {
        let result = extract_model("model 'gpt-5' not found");
        assert_eq!(result, Some("gpt-5".to_string()));
    }

    #[test]
    fn extract_model_returns_none_when_not_found() {
        let result = extract_model("just a regular error");
        assert_eq!(result, None);
    }

    #[test]
    fn truncate_message_short() {
        let result = truncate_message("hello", 10);
        assert_eq!(result, "hello");
    }

    #[test]
    fn truncate_message_long() {
        let result = truncate_message("hello world this is a long message", 10);
        assert_eq!(result, "hello worl...");
    }

    #[test]
    fn error_payload_builder_pattern() {
        let payload = CoworkErrorPayload::new("test")
            .with_details("details")
            .with_provider("p")
            .with_model("m")
            .with_code("c")
            .retryable();
        assert_eq!(payload.message, "test");
        assert_eq!(payload.details.as_deref(), Some("details"));
        assert_eq!(payload.provider.as_deref(), Some("p"));
        assert_eq!(payload.model.as_deref(), Some("m"));
        assert_eq!(payload.code.as_deref(), Some("c"));
        assert!(payload.retryable);
    }
}
