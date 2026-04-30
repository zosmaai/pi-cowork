//! MetaAgents Engine — manages multiple agent sessions with lifecycle control.
//!
//! The engine is the central coordinator: it creates, tracks, and destroys
//! [`Session`] instances. Each session wraps a single SDK [`AgentSessionHandle`]
//! and provides event streaming to the frontend.

use std::collections::HashMap;
use std::sync::Arc;

use pi::sdk::SessionOptions;
use tokio::sync::RwLock;

use crate::events::CoworkEvent;
use crate::session::{EngineError, Session, SessionId};

/// The MetaAgents engine — a session manager built on the pi SDK.
///
/// Create one instance at app startup and share it via `Arc` across
/// Tauri commands. Sessions are created on-demand and cleaned up when
/// the frontend navigates away.
pub struct MetaAgentsEngine {
    /// Active sessions keyed by their string ID.
    sessions: RwLock<HashMap<String, Arc<Session>>>,

    /// Default working directory for new sessions (can be overridden per-session).
    default_cwd: std::path::PathBuf,
}

impl MetaAgentsEngine {
    /// Create a new engine instance.
    ///
    /// Uses the current working directory as the default for all sessions.
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            default_cwd: std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("/")),
        }
    }

    /// Create a new session with the given options.
    ///
    /// Returns an `Arc<Session>` that can be shared across async tasks.
    pub async fn create_session(
        &self,
        id: String,
        options: SessionOptions,
    ) -> Result<Arc<Session>, EngineError> {
        let session_id = SessionId(id.clone());
        let session = Session::new(session_id, options).await?;
        let session_arc = Arc::new(session);

        self.sessions
            .write()
            .await
            .insert(id, Arc::clone(&session_arc));

        Ok(session_arc)
    }

    /// Get a reference to an existing session by ID.
    ///
    /// Returns `None` if the session doesn't exist.
    pub async fn get_session(&self, id: &str) -> Option<Arc<Session>> {
        self.sessions.read().await.get(id).cloned()
    }

    /// Remove and drop a session by ID.
    ///
    /// Returns `true` if the session existed and was removed.
    pub async fn drop_session(&self, id: &str) -> bool {
        self.sessions.write().await.remove(id).is_some()
    }

    /// List all active session IDs.
    pub async fn list_sessions(&self) -> Vec<String> {
        self.sessions.read().await.keys().cloned().collect()
    }

    /// Get the default working directory for new sessions.
    pub fn default_cwd(&self) -> &std::path::PathBuf {
        &self.default_cwd
    }

    /// Set the default working directory for new sessions.
    pub fn set_default_cwd<P: AsRef<std::path::Path>>(&self, cwd: P) {
        // Note: this requires making default_cwd interior-mutable.
        // For Phase C, we construct the engine with the right cwd upfront.
        let _ = cwd; // unused for now
    }

    /// Create a session with default options (uses system defaults from SDK).
    pub async fn create_default_session(&self, id: String) -> Result<Arc<Session>, EngineError> {
        let mut options = SessionOptions::default();
        options.working_directory = Some(self.default_cwd.clone());
        options.no_session = false; // Enable session persistence in the SDK
        self.create_session(id, options).await
    }

    /// Create a session with a specific provider and model.
    pub async fn create_session_with_model(
        &self,
        id: String,
        provider: String,
        model: String,
    ) -> Result<Arc<Session>, EngineError> {
        let mut options = SessionOptions::default();
        options.provider = Some(provider);
        options.model = Some(model);
        options.working_directory = Some(self.default_cwd.clone());
        options.no_session = false;
        self.create_session(id, options).await
    }

    /// Send a prompt to an existing session and return event receiver + join handle.
    pub async fn send_prompt(
        &self,
        session_id: String,
        text: String,
    ) -> Result<(tokio::sync::mpsc::UnboundedReceiver<CoworkEvent>, tokio::task::JoinHandle<Result<pi::sdk::AssistantMessage, EngineError>>), EngineError> {
        let session = self
            .get_session(&session_id)
            .await
            .ok_or_else(|| EngineError::SessionNotFound(session_id.clone()))?;

        session.prompt(text).await
    }

    /// Get messages from a session.
    pub async fn get_messages(
        &self,
        session_id: String,
    ) -> Result<Vec<pi::sdk::Message>, EngineError> {
        let session = self
            .get_session(&session_id)
            .await
            .ok_or_else(|| EngineError::SessionNotFound(session_id.clone()))?;

        session.messages().await
    }

    /// Get the current model for a session.
    pub async fn get_session_model(
        &self,
        session_id: String,
    ) -> Result<(String, String), EngineError> {
        let session = self
            .get_session(&session_id)
            .await
            .ok_or_else(|| EngineError::SessionNotFound(session_id.clone()))?;

        Ok(session.model().await)
    }

    /// Set the model for a session.
    pub async fn set_session_model(
        &self,
        session_id: String,
        provider: String,
        model_id: String,
    ) -> Result<(), EngineError> {
        let session = self
            .get_session(&session_id)
            .await
            .ok_or_else(|| EngineError::SessionNotFound(session_id.clone()))?;

        session.set_model(&provider, &model_id).await
    }

    /// Get the state snapshot for a session.
    pub async fn get_session_state(
        &self,
        session_id: String,
    ) -> Result<pi::sdk::AgentSessionState, EngineError> {
        let session = self
            .get_session(&session_id)
            .await
            .ok_or_else(|| EngineError::SessionNotFound(session_id.clone()))?;

        session.state().await
    }
}

impl Default for MetaAgentsEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_creates_with_default_cwd() {
        let engine = MetaAgentsEngine::new();
        assert!(engine.default_cwd().exists() || engine.default_cwd() == std::path::Path::new("/"));
    }

    #[test]
    fn engine_default_impl() {
        let engine = MetaAgentsEngine::default();
        assert_eq!(engine.default_cwd(), MetaAgentsEngine::new().default_cwd());
    }

    #[tokio::test]
    async fn engine_list_sessions_starts_empty() {
        let engine = MetaAgentsEngine::new();
        assert!(engine.list_sessions().await.is_empty());
    }

    #[tokio::test]
    async fn engine_drop_nonexistent_session_returns_false() {
        let engine = MetaAgentsEngine::new();
        assert!(!engine.drop_session("nonexistent").await);
    }

    #[tokio::test]
    async fn engine_get_nonexistent_session_returns_none() {
        let engine = MetaAgentsEngine::new();
        assert!(engine.get_session("nonexistent").await.is_none());
    }
}
