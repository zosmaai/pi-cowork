//! # MetaAgents Engine
//!
//! UI-agnostic agent harness built on the `pi_agent_rust` SDK.
//!
//! This crate is the core of the MetaAgents architecture. It exposes a stable
//! Rust API that desktop GUIs (Zosma Cowork), terminal UIs, and future
//! products (Zosma Code) can build on without coupling to the underlying pi
//! SDK shape.
//!
//! ## Phase A status
//!
//! This is a stub. Phase A only scaffolds the Cargo workspace; the real
//! implementation lands in Phases B–C of the upgrade plan
//! (`docs/2026-04-30-metaagents-upgrade-plan.md`).
//!
//! ## Roadmap
//!
//! - **Phase B** — add `pi_agent_rust` as a dependency and ship a smoke test
//!   that creates a session, sends a prompt, and receives a response.
//! - **Phase C** — flesh out [`engine`], [`session`], [`config`],
//!   [`extensions`], and [`events`] modules so the Tauri shell can drop its
//!   subprocess code.
//! - **Phase D** — Tauri backend migrates to call into this crate.

#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

/// Crate version, exposed for diagnostic surfaces (e.g. About dialog).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns a short banner describing this build of the engine.
///
/// Used by smoke tests and by the Tauri shell to confirm linkage during
/// Phase A. Will be supplemented by richer diagnostics in later phases.
pub fn banner() -> String {
    format!("metaagents v{VERSION} (phase-a scaffold)")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn banner_includes_version() {
        let b = banner();
        assert!(b.contains(VERSION));
        assert!(b.contains("metaagents"));
    }
}
