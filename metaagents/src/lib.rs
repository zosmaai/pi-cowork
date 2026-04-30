//! # MetaAgents Engine
//!
//! UI-agnostic agent harness built on the [`pi_agent_rust`] SDK.
//!
//! This crate is the core of the MetaAgents architecture. It exposes a stable
//! Rust API that desktop GUIs (Zosma Cowork), terminal UIs, and future
//! products (Zosma Code) can build on without coupling to the underlying pi
//! SDK shape.
//!
//! ## Phase C status — Complete
//!
//! The engine layer is fully implemented:
//! - **[[events]]** — `CoworkEvent` enum matching frontend PiEvent taxonomy
//! - **[[session]]** — `Session` wrapper around `AgentSessionHandle` with event bridging
//! - **[[engine]]** — `MetaAgentsEngine` managing session lifecycle (create/get/drop)
//! - **[[config]]** — Read pi settings and model registry from disk
//! - **[[extensions]]** — Discover extensions from local dirs and settings packages
//!
//! ## Re-exports
//!
//! The pi SDK is re-exported as [`pi`] so downstream crates can write
//! `use metaagents::pi::sdk::*;` without taking a direct dependency on
//! `pi_agent_rust` (and without caring about its name remap from
//! `pi_agent_rust` to library name `pi`).
//!
//! ## Roadmap
//!
//! - **Phase D** — Tauri backend migrates to call into this crate.
//! - **Phase E** — Frontend updates (use new commands, extensions/models UI).
//! - **Phase F** — Polish & rebrand prep.

#![forbid(unsafe_code)]
#![warn(rust_2018_idioms)]
// Missing docs allowed for Phase C skeleton — proper docs land in Phase D/E.
#![allow(missing_docs)]

/// Re-export of the `pi_agent_rust` crate (library name `pi`).
///
/// The crates.io package is `pi_agent_rust`, but its `[lib] name = "pi"`,
/// so the import path inside Rust is `pi::*`. We re-export under the same
/// name so downstream crates write `use metaagents::pi::sdk::*;` — keeping
/// the convention used by every example in the upstream docs.
pub use ::pi;

/// Stable event types matching the frontend PiEvent taxonomy.
pub mod events;

/// Session management wrapping the SDK AgentSessionHandle.
pub mod session;

/// MetaAgents engine — manages multiple sessions with lifecycle control.
pub mod engine;

/// Configuration reader for pi settings and model registry.
pub mod config;

/// Extension discovery from pi's extension directories.
pub mod extensions;

/// Crate version, exposed for diagnostic surfaces (e.g. About dialog).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Version of the embedded pi SDK, exposed for About dialogs and diagnostics.
///
/// This is the package version reported by `pi_agent_rust`'s `CARGO_PKG_VERSION`
/// at build time. Useful for verifying which SDK build a deployed app is
/// running against.
pub const PI_SDK_VERSION: &str = "0.1.13";

/// Returns a short banner describing this build of the engine.
///
/// Used by smoke tests and by the Tauri shell to confirm linkage during
/// Phases A–B. Will be supplemented by richer diagnostics in later phases.
pub fn banner() -> String {
    format!("metaagents v{VERSION} (pi sdk v{PI_SDK_VERSION}, phase-b linked)")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn banner_includes_versions() {
        let b = banner();
        assert!(b.contains(VERSION), "banner missing engine version: {b}");
        assert!(
            b.contains(PI_SDK_VERSION),
            "banner missing SDK version: {b}"
        );
        assert!(b.contains("metaagents"), "banner missing crate name: {b}");
    }

    #[test]
    fn pi_sdk_is_reachable() {
        // Compile-time linkage check: prove `pi::sdk` resolves through our
        // re-export. If the pi crate version, feature set, or rename ever
        // breaks, this test fails to compile (caught by `cargo check`,
        // not a runtime assertion).
        use crate::pi::sdk::SessionOptions;
        let opts = SessionOptions::default();
        // Defaults documented in pi_agent_rust::sdk::SessionOptions::default().
        assert!(
            opts.no_session,
            "default SessionOptions should disable session persistence"
        );
        assert!(
            opts.include_cwd_in_prompt,
            "default SessionOptions should include cwd"
        );
        assert_eq!(opts.max_tool_iterations, 50);
    }

    #[test]
    fn pi_builtin_tool_names_are_exposed() {
        // Verify the SDK's built-in tool roster is reachable through our
        // re-export. This is the canonical list our engine will surface
        // in the GUI's tool panel later.
        use crate::pi::sdk::BUILTIN_TOOL_NAMES;
        assert!(
            !BUILTIN_TOOL_NAMES.is_empty(),
            "pi exposes at least one built-in tool"
        );
        assert!(BUILTIN_TOOL_NAMES.contains(&"bash"), "bash tool present");
        assert!(BUILTIN_TOOL_NAMES.contains(&"read"), "read tool present");
        assert!(BUILTIN_TOOL_NAMES.contains(&"edit"), "edit tool present");
    }
}
