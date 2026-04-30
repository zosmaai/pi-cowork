//! Session management — wraps the SDK [`AgentSessionHandle`] with event bridging.
//!
//! Each session represents one persistent agent conversation. The session
//! translates SDK [`AgentEvent`]s into [[CoworkEvent]]s and fans them out
//! through a tokio mpsc channel so the Tauri backend can forward them to the
//! frontend.

use std::path::PathBuf;
use std::sync::Arc;

use pi::sdk::{
    AgentSessionHandle, AssistantMessage, Message, SessionOptions,
};
use tokio::sync::{mpsc, Mutex};

use crate::events::{agent_event_to_cowork, CoworkEvent, CoworkSessionEvent};

/// Opaque session identifier.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SessionId(pub String);

/// Errors specific to the metaagents engine layer.
#[derive(Debug, thiserror::Error)]
pub enum EngineError {
    #[error("SDK error: {0}")]
    Sdk(#[from] pi::sdk::Error),

    #[error("session not found: {0}")]
    SessionNotFound(String),

    #[error("channel closed")]
    ChannelClosed,

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("config error: {0}")]
    Config(String),
}

/// A managed agent session wrapping the SDK handle.
///
/// The session maintains an internal event channel that translates SDK events
/// into `CoworkEvent` for downstream consumers (Tauri commands).
pub struct Session {
    /// Unique session identifier.
    pub id: SessionId,

    /// The underlying SDK session handle (shared via Arc for cloning in prompt()).
    handle: Arc<Mutex<AgentSessionHandle>>,

    /// Sender half of the internal event channel.
    /// Events sent here are translated from SDK AgentEvent → CoworkEvent.
    /// Protected by Mutex because we may need to swap senders when consumers change.
    event_tx: Mutex<mpsc::UnboundedSender<CoworkEvent>>,
}

impl Session {
    /// Create a new session by calling into the SDK.
    ///
    /// This loads config, resolves the provider/model, sets up tools, and
    /// initializes extensions (if paths are provided).
    pub async fn new(id: SessionId, options: SessionOptions) -> Result<Self, EngineError> {
        let handle = pi::sdk::create_agent_session(options).await?;

        let (event_tx, mut event_rx) = mpsc::unbounded_channel::<CoworkEvent>();

        // Subscribe to session-level events and translate them.
        let tx_clone = event_tx.clone();
        let _sub_id = handle.subscribe(move |sdk_event| {
            if let Some(cowork) = agent_event_to_cowork(&sdk_event) {
                let _ = tx_clone.send(cowork);
            }
        });

        // Spawn a background task to drain the receiver so the channel never
        // back-pressures and we don't leak events if nobody is reading.
        tokio::spawn(async move {
            while event_rx.recv().await.is_some() {
                // Events consumed to prevent channel buildup.
                // Actual consumers get their own cloned sender from prompt().
            }
        });

        Ok(Self {
            id,
            handle: Arc::new(Mutex::new(handle)),
            event_tx: Mutex::new(event_tx),
        })
    }

    /// Send a user prompt and return a receiver for the streaming events.
    ///
    /// The returned receiver yields `CoworkEvent`s in real-time as the agent
    /// processes the prompt. When the receiver is exhausted, the prompt is
    /// complete.
    ///
    /// Returns both the event receiver and a JoinHandle for the final result.
    pub async fn prompt(
        &self,
        text: String,
    ) -> Result<(mpsc::UnboundedReceiver<CoworkEvent>, tokio::task::JoinHandle<Result<AssistantMessage, EngineError>>), EngineError> {
        let (prompt_tx, prompt_rx) = mpsc::unbounded_channel::<CoworkEvent>();

        // Also fan out to the session-level channel.
        let session_tx = {
            let guard = self.event_tx.lock().await;
            guard.clone()
        };

        let handle = Arc::clone(&self.handle);

        let join_handle = tokio::spawn(async move {
            let result = (async {
                let mut guard = handle.lock().await;

                // Combine the prompt-specific and session-level channels.
                let assistant = guard
                    .prompt(text, move |sdk_event| {
                        if let Some(cowork) = agent_event_to_cowork(&sdk_event) {
                            let _ = prompt_tx.send(cowork.clone());
                            let _ = session_tx.send(cowork);
                        }
                    })
                    .await?;

                Ok(assistant)
            }).await;

            result
        });

        Ok((prompt_rx, join_handle))
    }

    /// Return all messages in the current session.
    pub async fn messages(&self) -> Result<Vec<Message>, EngineError> {
        let guard = self.handle.lock().await;
        Ok(guard.messages().await?)
    }

    /// Update the active provider/model for this session.
    pub async fn set_model(&self, provider: &str, model_id: &str) -> Result<(), EngineError> {
        let mut guard = self.handle.lock().await;
        guard.set_model(provider, model_id).await?;
        Ok(())
    }

    /// Return the current provider/model pair.
    pub async fn model(&self) -> (String, String) {
        let guard = self.handle.lock().await;
        guard.model()
    }

    /// Return a state snapshot for this session.
    pub async fn state(&self) -> Result<pi::sdk::AgentSessionState, EngineError> {
        let guard = self.handle.lock().await;
        Ok(guard.state().await?)
    }

    /// Return the current thinking level.
    pub async fn thinking_level(&self) -> Option<pi::sdk::ThinkingLevel> {
        let guard = self.handle.lock().await;
        guard.thinking_level()
    }

    /// Update thinking level.
    pub async fn set_thinking_level(
        &self,
        level: pi::sdk::ThinkingLevel,
    ) -> Result<(), EngineError> {
        let mut guard = self.handle.lock().await;
        guard.set_thinking_level(level).await?;
        Ok(())
    }



    /// Emit a session header event (async version for use in Tauri commands).
    pub async fn emit_session_event_async(&self, cwd: PathBuf) -> Result<(), EngineError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let secs = now.as_secs() as i64;
        let timestamp = format!(
            "{}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
            1970 + (secs / 31557600) as i32,
            ((secs / 2592000) % 12) as i32 + 1,
            ((secs / 86400) % 31) as i32 + 1,
            (secs / 3600) as i32 % 24,
            (secs / 60) as i32 % 60,
            secs as i32 % 60,
        );

        let event = CoworkEvent::Session(CoworkSessionEvent {
            version: 1,
            session_id: self.id.0.clone(),
            timestamp,
            working_directory: cwd.to_string_lossy().to_string(),
        });

        let tx = self.event_tx.lock().await;
        tx.send(event).map_err(|_| EngineError::ChannelClosed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_id_is_cloneable() {
        let id = SessionId("test-123".to_string());
        let id2 = id.clone();
        assert_eq!(id, id2);
    }

    #[test]
    fn engine_error_sdk_conversion() {
        // Verify EngineError implements From<pi::sdk::Error>
        let _f: fn(pi::sdk::Error) -> EngineError = Into::into;
    }

    #[test]
    fn cowork_session_event_serializes() {
        let event = CoworkSessionEvent {
            version: 1,
            session_id: "abc".to_string(),
            timestamp: "2026-04-30T00:00:00Z".to_string(),
            working_directory: "/tmp".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""sessionId":"abc""#));
    }

    #[test]
    fn engine_error_session_not_found() {
        let err = EngineError::SessionNotFound("missing".to_string());
        assert!(err.to_string().contains("missing"));
    }

    #[test]
    fn engine_error_channel_closed() {
        let err = EngineError::ChannelClosed;
        assert_eq!(err.to_string(), "channel closed");
    }
}
