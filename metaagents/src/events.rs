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
    AgentEnd {
        messages: Vec<Message>,
    },

    /// Turn lifecycle start.
    TurnStart,

    /// Turn lifecycle end.
    TurnEnd {
        message: Message,
        #[serde(rename = "toolResults")]
        tool_results: Vec<Message>,
    },

    /// Message lifecycle start.
    MessageStart {
        message: Message,
    },

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
    MessageEnd {
        message: Message,
    },

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
    CompactionStart {
        reason: String,
    },

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

    /// Error event (synthesized or from SDK).
    Error {
        message: String,
    },
}

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
    Image {
        source: CoworkImageSource,
    },
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
                pi::sdk::ContentBlock::Text(t) => CoworkContentBlock::Text { text: t.text.clone() },
                pi::sdk::ContentBlock::Thinking(t) => {
                    CoworkContentBlock::Thinking { thinking: t.thinking.clone() }
                }
                pi::sdk::ContentBlock::Image(img) => CoworkContentBlock::Image {
                    source: CoworkImageSource {
                        source_type: "base64".to_string(),
                        media_type: img.mime_type.clone(),
                        data: img.data.clone(),
                    },
                },
                pi::sdk::ContentBlock::ToolCall(_) => {
                    // Tool calls in tool output are unusual; skip.
                    CoworkContentBlock::Text { text: String::new() }
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
pub fn agent_event_to_cowork(
    event: &pi::sdk::AgentEvent,
) -> Option<CoworkEvent> {
    use pi::sdk::AgentEvent;

    match event {
        AgentEvent::AgentStart { .. } => Some(CoworkEvent::AgentStart),

        AgentEvent::AgentEnd { messages, error: None, .. } => {
            Some(CoworkEvent::AgentEnd { messages: messages.clone() })
        }

        AgentEvent::AgentEnd { error: Some(msg), .. } => {
            Some(CoworkEvent::Error { message: msg.clone() })
        }

        AgentEvent::TurnStart { .. } => Some(CoworkEvent::TurnStart),

        AgentEvent::TurnEnd { message, tool_results, .. } => {
            Some(CoworkEvent::TurnEnd {
                message: message.clone(),
                tool_results: tool_results.clone(),
            })
        }

        AgentEvent::MessageStart { message } => Some(CoworkEvent::MessageStart { message: message.clone() }),

        AgentEvent::MessageUpdate { message, .. } => {
            // The SDK's `AssistantMessageEvent` is not publicly re-exported,
            // so we serialize the full event and extract the field as JSON.
            let event_json = serde_json::to_value(event).ok()?;
            let ame = event_json.get("assistantMessageEvent").cloned().unwrap_or_default();
            Some(CoworkEvent::MessageUpdate {
                message: message.clone(),
                assistant_message_event: ame,
            })
        }

        AgentEvent::MessageEnd { message } => Some(CoworkEvent::MessageEnd { message: message.clone() }),

        AgentEvent::ToolExecutionStart { tool_call_id, tool_name, args, .. } => {
            Some(CoworkEvent::ToolExecutionStart {
                tool_call_id: tool_call_id.clone(),
                tool_name: tool_name.clone(),
                args: args.clone(),
            })
        }

        AgentEvent::ToolExecutionUpdate { tool_call_id, tool_name, args, partial_result, .. } => {
            Some(CoworkEvent::ToolExecutionUpdate {
                tool_call_id: tool_call_id.clone(),
                tool_name: tool_name.clone(),
                args: args.clone(),
                partial_result: CoworkToolOutput::from_tool_output(partial_result),
            })
        }

        AgentEvent::ToolExecutionEnd { tool_call_id, tool_name, result, is_error, .. } => {
            Some(CoworkEvent::ToolExecutionEnd {
                tool_call_id: tool_call_id.clone(),
                tool_name: tool_name.clone(),
                result: CoworkToolOutput::from_tool_output(result),
                is_error: *is_error,
            })
        }

        AgentEvent::AutoCompactionStart { reason, .. } => {
            Some(CoworkEvent::CompactionStart { reason: reason.clone() })
        }

        AgentEvent::AutoCompactionEnd { result, aborted, will_retry, error_message, .. } => {
            Some(CoworkEvent::CompactionEnd {
                reason: "auto".to_string(),
                result: result.clone(),
                aborted: *aborted,
                will_retry: *will_retry,
                error_message: error_message.clone(),
            })
        }

        AgentEvent::AutoRetryStart { attempt, max_attempts, delay_ms, error_message, .. } => {
            Some(CoworkEvent::AutoRetryStart {
                attempt: *attempt,
                max_attempts: *max_attempts,
                delay_ms: *delay_ms,
                error_message: error_message.clone(),
            })
        }

        AgentEvent::AutoRetryEnd { success, attempt, final_error, .. } => {
            Some(CoworkEvent::AutoRetryEnd {
                success: *success,
                attempt: *attempt,
                final_error: final_error.clone(),
            })
        }

        // Extension errors are internal — frontend doesn't need them.
        AgentEvent::ExtensionError { .. } => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
            content: vec![CoworkContentBlock::Text { text: "done".to_string() }],
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
    fn cowork_event_error_serializes() {
        let event = CoworkEvent::Error { message: "timeout".to_string() };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"error""#));
        assert!(json.contains(r#""message":"timeout""#));
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
    fn cowork_tool_output_from_sdk_flattens_content() {
        let tool_output = ToolOutput {
            content: vec![
                pi::sdk::ContentBlock::Text(pi::sdk::TextContent::new("hello")),
            ],
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
            CoworkEvent::Error { message } => assert_eq!(message, "something broke"),
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

    #[test]
    fn cowork_event_roundtrip_tool_execution_update() {
        let output = CoworkToolOutput {
            content: vec![CoworkContentBlock::Text { text: "partial".to_string() }],
            details: Some(serde_json::json!({"lines": 42})),
        };
        let event = CoworkEvent::ToolExecutionUpdate {
            tool_call_id: "tc-3".to_string(),
            tool_name: "grep".to_string(),
            args: serde_json::json!({}),
            partial_result: output,
        };
        let json = serde_json::to_string(&event).unwrap();
        let parsed: CoworkEvent = serde_json::from_str(&json).unwrap();
        match parsed {
            CoworkEvent::ToolExecutionUpdate { tool_call_id, tool_name, .. } => {
                assert_eq!(tool_call_id, "tc-3");
                assert_eq!(tool_name, "grep");
            }
            _ => panic!("expected ToolExecutionUpdate"),
        }
    }

    #[test]
    fn cowork_event_compaction_start_serializes() {
        let event = CoworkEvent::CompactionStart { reason: "threshold".to_string() };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"compaction_start""#));
        assert!(json.contains(r#""reason":"threshold""#));
    }

    #[test]
    fn cowork_event_auto_retry_serializes() {
        let event = CoworkEvent::AutoRetryStart {
            attempt: 1,
            max_attempts: 3,
            delay_ms: 2000,
            error_message: "rate limited".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"auto_retry_start""#));
        assert!(json.contains(r#""attempt":1"#));
        assert!(json.contains(r#""maxAttempts":3"#));
    }
}
