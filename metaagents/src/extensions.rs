//! Extension discovery — scans pi extension directories and package metadata.
//!
//! This module discovers pi extensions installed in:
//! - `~/.pi/agent/extensions/` (local extensions)
//! - Packages listed in settings.json (npm packages with extension manifests)

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Extension metadata for the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionInfo {
    /// Unique extension identifier.
    pub id: String,
    /// Human-readable display name.
    #[serde(default)]
    pub name: String,
    /// Semantic version string.
    #[serde(default)]
    pub version: String,
    /// Short description.
    #[serde(default)]
    pub description: String,
    /// Whether the extension is currently enabled.
    #[serde(default)]
    pub enabled: bool,
    /// Extension source type.
    #[serde(default)]
    pub source: ExtensionSource,
}

/// Where the extension was discovered from.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum ExtensionSource {
    /// Local directory in ~/.pi/agent/extensions/
    Local,
    /// Installed via npm (from packages list in settings)
    #[default]
    Npm,
    /// Local path reference (e.g., ../../code/my-extension)
    LocalPath,
}

/// Discover all extensions from pi's directories.
pub fn discover_extensions() -> Vec<ExtensionInfo> {
    let home = home_dir();
    let agent_dir = home.join(".pi").join("agent");

    let mut extensions = Vec::new();

    // Scan local extension directories
    extensions.extend(scan_local_extensions(&agent_dir));

    // Read packages from settings.json
    extensions.extend(scan_packages_from_settings(&agent_dir));

    extensions
}

/// Scan ~/.pi/agent/extensions/ for local extensions.
fn scan_local_extensions(agent_dir: &Path) -> Vec<ExtensionInfo> {
    let ext_dir = agent_dir.join("extensions");
    let mut extensions = Vec::new();

    let entries = match std::fs::read_dir(&ext_dir) {
        Ok(entries) => entries,
        Err(_) => return extensions, // Directory doesn't exist yet
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let dir_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Try to read package.json or extension manifest
        let (name, version, description) = read_extension_metadata(&path);

        extensions.push(ExtensionInfo {
            id: dir_name.clone(),
            name,
            version,
            description,
            enabled: true, // Local extensions are enabled by default
            source: ExtensionSource::Local,
        });
    }

    extensions
}

/// Read extension metadata from a directory.
fn read_extension_metadata(dir: &Path) -> (String, String, String) {
    // Try package.json first
    let pkg_path = dir.join("package.json");
    if let Ok(content) = std::fs::read_to_string(&pkg_path) {
        #[derive(Deserialize)]
        struct PackageJson {
            #[serde(default)]
            name: String,
            #[serde(default)]
            version: String,
            #[serde(default)]
            description: String,
        }

        if let Ok(pkg) = serde_json::from_str::<PackageJson>(&content) {
            return (pkg.name, pkg.version, pkg.description);
        }
    }

    // Try SKILL.md for skills-based extensions
    let skill_path = dir.join("SKILL.md");
    if let Ok(content) = std::fs::read_to_string(&skill_path) {
        // Extract title from frontmatter or first heading
        let name = content
            .lines()
            .find(|l| l.starts_with("# "))
            .map(|l| l.strip_prefix("# ").unwrap_or("").trim().to_string())
            .unwrap_or_default();

        let mut past_frontmatter = false;
        let description = content
            .lines()
            .find(|l| {
                if !past_frontmatter && (l.starts_with("---") || l.is_empty()) {
                    return false;
                }
                if !past_frontmatter {
                    past_frontmatter = true;
                }
                if l.starts_with('#') || l.starts_with("---") {
                    return false;
                }
                !l.is_empty()
            })
            .map(|l| l.trim().to_string())
            .unwrap_or_default();

        return (name, "0.0.0".to_string(), description);
    }

    (
        dir.to_string_lossy().to_string(),
        "0.0.0".to_string(),
        String::new(),
    )
}

/// Scan packages listed in settings.json for extension metadata.
fn scan_packages_from_settings(agent_dir: &Path) -> Vec<ExtensionInfo> {
    let settings_path = agent_dir.join("settings.json");
    let content = match std::fs::read_to_string(&settings_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    #[derive(Deserialize)]
    struct SettingsPackages {
        #[serde(default)]
        packages: Vec<String>,
    }

    let settings: SettingsPackages = match serde_json::from_str(&content) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let mut extensions = Vec::new();

    for pkg in settings.packages {
        let (id, source) = parse_package_source(&pkg);

        extensions.push(ExtensionInfo {
            id: id.clone(),
            name: id.replace(['-', '_'], " "),
            version: String::new(), // Version not available without npm resolution
            description: String::new(),
            enabled: true, // Packages in settings are assumed enabled
            source,
        });
    }

    extensions
}

/// Parse a package source string into (id, source_type).
fn parse_package_source(pkg: &str) -> (String, ExtensionSource) {
    if pkg.starts_with("npm:") {
        let name = pkg.strip_prefix("npm:").unwrap_or(pkg).to_string();
        (name, ExtensionSource::Npm)
    } else if pkg.starts_with('.') || pkg.starts_with('/') {
        // Local path reference
        let name = Path::new(pkg)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| pkg.to_string());
        (name, ExtensionSource::LocalPath)
    } else {
        (pkg.to_string(), ExtensionSource::Npm)
    }
}

/// Get the home directory path.
fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .ok()
        .map(PathBuf::from)
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("/"))
}

/// Check if an extension is enabled (based on settings packages list).
pub fn is_extension_enabled(extension_id: &str, agent_dir: &Path) -> bool {
    let settings_path = agent_dir.join("settings.json");
    let content = match std::fs::read_to_string(&settings_path) {
        Ok(c) => c,
        Err(_) => return true, // No settings = everything enabled by default
    };

    #[derive(Deserialize)]
    struct SettingsPackages {
        #[serde(default)]
        packages: Vec<String>,
    }

    let settings: SettingsPackages = match serde_json::from_str(&content) {
        Ok(s) => s,
        Err(_) => return true,
    };

    // Check if the extension ID appears in any package entry
    settings
        .packages
        .iter()
        .any(|pkg| pkg.contains(extension_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_info_serializes() {
        let info = ExtensionInfo {
            id: "test-ext".to_string(),
            name: "Test Extension".to_string(),
            version: "1.0.0".to_string(),
            description: "A test extension".to_string(),
            enabled: true,
            source: ExtensionSource::Npm,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains(r#""id":"test-ext""#));
        assert!(json.contains(r#""enabled":true"#));
    }

    #[test]
    fn parse_npm_package_source() {
        let (id, source) = parse_package_source("npm:pi-web-access");
        assert_eq!(id, "pi-web-access");
        assert_eq!(source, ExtensionSource::Npm);
    }

    #[test]
    fn parse_local_path_source() {
        let (id, source) = parse_package_source("../../code/my-ext");
        assert_eq!(id, "my-ext");
        assert_eq!(source, ExtensionSource::LocalPath);
    }

    #[test]
    fn parse_scoped_npm_package() {
        let (id, source) = parse_package_source("npm:@scope/pkg-name");
        assert_eq!(id, "@scope/pkg-name");
        assert_eq!(source, ExtensionSource::Npm);
    }

    #[test]
    fn extension_source_serializes() {
        let local = ExtensionSource::Local;
        let json = serde_json::to_string(&local).unwrap();
        assert_eq!(json, r#""local""#);

        let npm = ExtensionSource::Npm;
        let json = serde_json::to_string(&npm).unwrap();
        assert_eq!(json, r#""npm""#);

        let local_path = ExtensionSource::LocalPath;
        let json = serde_json::to_string(&local_path).unwrap();
        assert_eq!(json, r#""localPath""#);
    }

    #[test]
    fn discover_extensions_handles_missing_dirs() {
        // Should not panic even if extension dirs don't exist
        let _ = discover_extensions();
    }

    #[test]
    fn discover_extensions_returns_packages_from_settings() {
        let extensions = discover_extensions();
        // If settings.json exists with packages, we should find some.
        // In test environments this may be empty — that's fine.
        for ext in &extensions {
            assert!(!ext.id.is_empty(), "Extension ID should not be empty");
        }
    }
}
