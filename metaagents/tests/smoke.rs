//! End-to-end SDK linkage smoke test.
//!
//! This test exercises the pi SDK through the metaagents re-export to prove
//! the dependency is wired up correctly and the public surface compiles.
//!
//! Two layers:
//!
//! 1. `sdk_session_options_compile` — always runs in CI. Constructs
//!    `SessionOptions`, mutates fields, and calls a few `pi::sdk::*` factory
//!    functions. No network, no LLM call.
//!
//! 2. `sdk_live_prompt_roundtrip` — opt-in, gated on `PI_TEST_LIVE=1`. When
//!    set, this test creates a real agent session, sends a tiny prompt, and
//!    asserts a non-empty response. Requires provider credentials in the
//!    user's pi config (`~/.pi/agent/settings.json`) or the corresponding
//!    env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).
//!
//! Run live: `PI_TEST_LIVE=1 cargo test -p metaagents --test smoke -- --nocapture`

use metaagents::pi::sdk::{self, all_tool_definitions, SessionOptions, ToolDefinition};
use std::env;
use std::path::PathBuf;

#[test]
fn sdk_session_options_compile() {
    // Build options that exercise the public setters we plan to use from
    // the Tauri command layer in Phase D.
    let opts = SessionOptions {
        provider: Some("anthropic".to_string()),
        model: Some("claude-3-5-sonnet-latest".to_string()),
        system_prompt: Some("You are an integration smoke test.".to_string()),
        working_directory: Some(PathBuf::from("/tmp")),
        no_session: true,
        ..SessionOptions::default()
    };

    assert_eq!(opts.provider.as_deref(), Some("anthropic"));
    assert_eq!(opts.max_tool_iterations, 50);
    assert!(opts.no_session);
}

#[test]
fn sdk_builtin_tools_resolve() {
    // Resolve the built-in tool definitions for a working directory.
    // Forces the SDK's tool factory chain (BashTool::new, ReadTool::new, ...)
    // to actually link and instantiate. If feature flags or feature unification
    // ever drop a built-in tool, this test catches it.
    let cwd = env::temp_dir();
    let defs: Vec<ToolDefinition> = all_tool_definitions(&cwd);
    assert!(!defs.is_empty(), "expected at least one built-in tool");

    // Spot-check a few we depend on.
    let names: Vec<&str> = defs.iter().map(|d| d.name.as_str()).collect();
    for required in ["bash", "read", "edit", "write", "grep", "find", "ls"] {
        assert!(
            names.contains(&required),
            "built-in tool `{required}` missing; got {names:?}"
        );
    }
}

#[test]
fn sdk_re_export_paths_match_upstream() {
    // The Tauri layer will type its commands against these names.
    // If pi ever renames them upstream, this test fails to compile.
    let _opts: SessionOptions = SessionOptions::default();
    let _names: &[&str] = sdk::BUILTIN_TOOL_NAMES;
}

/// Live end-to-end prompt round-trip.
///
/// Skipped unless `PI_TEST_LIVE=1` is set. Requires a configured provider
/// in `~/.pi/agent/settings.json` *or* an `*_API_KEY` env var that pi can
/// pick up. Intentionally not run in CI to avoid pinning us to a specific
/// provider's free tier.
#[tokio::test]
async fn sdk_live_prompt_roundtrip() {
    if env::var("PI_TEST_LIVE").ok().as_deref() != Some("1") {
        eprintln!("PI_TEST_LIVE not set; skipping live SDK round-trip.");
        return;
    }

    let opts = SessionOptions {
        no_session: true,
        include_cwd_in_prompt: false,
        ..SessionOptions::default()
    };

    let mut handle = match sdk::create_agent_session(opts).await {
        Ok(h) => h,
        Err(e) => panic!("create_agent_session failed: {e}"),
    };

    let response = handle
        .prompt("Reply with the single word: pong", |_event| {})
        .await
        .expect("live prompt should succeed when PI_TEST_LIVE=1");

    // The assistant message should have at least one text block.
    let any_text = response
        .content
        .iter()
        .any(|c| matches!(c, metaagents::pi::sdk::ContentBlock::Text(_)));
    assert!(any_text, "expected at least one text content block");
}
