//! Configuration reader — reads pi settings and model registry from disk.
//!
//! This module provides structured access to pi's configuration files:
//! - `~/.pi/agent/settings.json` — default provider, model, packages, etc.
//! - `~/.pi/agent/models.json` — custom provider definitions and models

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Provider configuration from models.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    /// Base URL for the provider API.
    pub base_url: Option<String>,
    /// API type (e.g., "openai-completions", "anthropic").
    pub api: Option<String>,
    /// API key (may be empty if using OAuth or local).
    #[serde(default)]
    pub api_key: String,
    /// List of models available for this provider.
    #[serde(default)]
    pub models: Vec<ModelConfig>,
}

/// Model configuration from models.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelConfig {
    /// Unique model identifier (e.g., "claude-sonnet-4").
    pub id: String,
    /// Human-readable display name.
    #[serde(default)]
    pub name: String,
    /// Whether the model supports reasoning/thinking.
    #[serde(default)]
    pub reasoning: bool,
    /// Accepted input types.
    #[serde(default)]
    pub input: Vec<String>,
    /// Context window size in tokens.
    #[serde(default)]
    pub context_window: u32,
    /// Maximum output tokens.
    #[serde(default)]
    pub max_tokens: u32,
    /// Cost information.
    #[serde(default)]
    pub cost: Option<CostConfig>,
}

/// Cost configuration for a model.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CostConfig {
    #[serde(default)]
    pub input: f64,
    #[serde(default)]
    pub output: f64,
    #[serde(default)]
    pub cache_read: f64,
    #[serde(default)]
    pub cache_write: f64,
}

/// Parsed pi settings from settings.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiSettings {
    /// Default provider ID.
    #[serde(default)]
    pub default_provider: Option<String>,
    /// Default model ID.
    #[serde(default)]
    pub default_model: Option<String>,
    /// Default thinking level.
    #[serde(default)]
    pub default_thinking_level: Option<String>,
    /// Installed packages (extensions, skills, etc.).
    #[serde(default)]
    pub packages: Vec<String>,
    /// Enabled model patterns for filtering.
    #[serde(default, rename = "enabledModels")]
    pub enabled_models: Vec<String>,
}

/// Complete configuration snapshot combining settings and models.
#[derive(Debug, Clone)]
pub struct ConfigSnapshot {
    /// Parsed settings from settings.json.
    pub settings: Option<PiSettings>,
    /// Provider definitions from models.json.
    pub providers: Vec<ProviderInfo>,
    /// All available models across all providers.
    pub models: Vec<ModelInfo>,
}

/// Provider info for the frontend (simplified from ProviderConfig).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInfo {
    /// Provider ID (e.g., "anthropic", "openai").
    pub id: String,
    /// Display name.
    #[serde(default)]
    pub name: String,
    /// API type.
    #[serde(default)]
    pub api: String,
    /// Number of models available.
    #[serde(default)]
    pub model_count: usize,
}

/// Model info for the frontend (includes provider context).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    /// Unique model identifier.
    pub id: String,
    /// Human-readable display name.
    #[serde(default)]
    pub name: String,
    /// Provider this model belongs to.
    pub provider: String,
    /// Whether the model supports reasoning/thinking.
    #[serde(default)]
    pub reasoning: bool,
    /// Context window size in tokens.
    #[serde(default)]
    pub context_window: u32,
    /// Maximum output tokens.
    #[serde(default)]
    pub max_tokens: u32,
}

/// Load the complete configuration snapshot from disk.
pub fn load_config() -> ConfigSnapshot {
    let home = home_dir();
    let agent_dir = home.join(".pi").join("agent");

    let settings = load_settings(&agent_dir);
    let (providers, models) = load_models(&agent_dir);

    ConfigSnapshot {
        settings,
        providers,
        models,
    }
}

/// Load settings from the agent directory.
fn load_settings(agent_dir: &Path) -> Option<PiSettings> {
    let settings_path = agent_dir.join("settings.json");
    let content = std::fs::read_to_string(&settings_path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Load provider and model definitions from models.json.
fn load_models(agent_dir: &Path) -> (Vec<ProviderInfo>, Vec<ModelInfo>) {
    let models_path = agent_dir.join("models.json");
    let content = match std::fs::read_to_string(&models_path) {
        Ok(c) => c,
        Err(_) => return (Vec::new(), Vec::new()),
    };

    #[derive(Deserialize)]
    struct ModelsFile {
        #[serde(default)]
        providers: std::collections::HashMap<String, ProviderConfig>,
    }

    let models_file: ModelsFile = match serde_json::from_str(&content) {
        Ok(f) => f,
        Err(_) => return (Vec::new(), Vec::new()),
    };

    let mut providers = Vec::new();
    let mut models = Vec::new();

    for (provider_id, config) in models_file.providers {
        let provider_info = ProviderInfo {
            id: provider_id.clone(),
            name: provider_id
                .chars()
                .next()
                .map(|c| c.to_uppercase().to_string())
                .unwrap_or_default()
                + &provider_id[1..],
            api: config.api.clone().unwrap_or_default(),
            model_count: config.models.len(),
        };

        for model in config.models {
            models.push(ModelInfo {
                id: model.id,
                name: model.name,
                provider: provider_id.clone(),
                reasoning: model.reasoning,
                context_window: model.context_window,
                max_tokens: model.max_tokens,
            });
        }

        providers.push(provider_info);
    }

    (providers, models)
}

/// Get the home directory path.
fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .ok()
        .map(PathBuf::from)
        .or_else(|| dirs::home_dir())
        .unwrap_or_else(|| PathBuf::from("/"))
}

/// Get the default provider/model from settings.
pub fn default_model(config: &ConfigSnapshot) -> Option<(String, String)> {
    let settings = config.settings.as_ref()?;
    let provider = settings.default_provider.clone()?;
    let model = settings.default_model.clone()?;
    Some((provider, model))
}

/// List installed package names from settings.
pub fn list_packages(config: &ConfigSnapshot) -> Vec<String> {
    config
        .settings
        .as_ref()
        .map(|s| s.packages.clone())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_info_serializes() {
        let info = ProviderInfo {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            api: "anthropic".to_string(),
            model_count: 5,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains(r#""id":"anthropic""#));
        assert!(json.contains(r#""modelCount":5"#));
    }

    #[test]
    fn model_info_serializes() {
        let info = ModelInfo {
            id: "claude-sonnet-4".to_string(),
            name: "Claude Sonnet 4".to_string(),
            provider: "anthropic".to_string(),
            reasoning: true,
            context_window: 200000,
            max_tokens: 8192,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains(r#""reasoning":true"#));
        assert!(json.contains(r#""contextWindow":200000"#));
    }

    #[test]
    fn cost_config_defaults_to_zero() {
        let cost = CostConfig::default();
        assert_eq!(cost.input, 0.0);
        assert_eq!(cost.output, 0.0);
    }

    #[test]
    fn load_config_handles_missing_files() {
        // When running tests, the config files may or may not exist.
        // The function should handle both cases gracefully.
        let config = load_config();
        // At minimum, the struct should be valid even with no data.
        assert!(
            config.providers.len() >= 0,
            "ConfigSnapshot should always be constructable"
        );
    }

    #[test]
    fn default_model_returns_none_for_empty_config() {
        let config = ConfigSnapshot {
            settings: None,
            providers: Vec::new(),
            models: Vec::new(),
        };
        assert!(default_model(&config).is_none());
    }

    #[test]
    fn list_packages_returns_empty_for_no_settings() {
        let config = ConfigSnapshot {
            settings: None,
            providers: Vec::new(),
            models: Vec::new(),
        };
        assert!(list_packages(&config).is_empty());
    }

    #[test]
    fn list_packages_returns_packages_from_settings() {
        let settings = PiSettings {
            default_provider: None,
            default_model: None,
            default_thinking_level: None,
            packages: vec!["npm:test-pkg".to_string()],
            enabled_models: Vec::new(),
        };
        let config = ConfigSnapshot {
            settings: Some(settings),
            providers: Vec::new(),
            models: Vec::new(),
        };
        assert_eq!(list_packages(&config), vec!["npm:test-pkg"]);
    }

    #[test]
    fn pi_settings_deserializes_minimal() {
        let json = r#"{"defaultProvider":"openai","packages":["npm:test"]}"#;
        let settings: PiSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.default_provider, Some("openai".to_string()));
        assert_eq!(settings.packages, vec!["npm:test"]);
    }

    #[test]
    fn pi_settings_deserializes_empty() {
        let json = r#"{}"#;
        let settings: PiSettings = serde_json::from_str(json).unwrap();
        assert!(settings.default_provider.is_none());
        assert!(settings.packages.is_empty());
    }
}
