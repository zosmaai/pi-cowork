# Distribution Guide

This document covers all channels for distributing Pi Cowork.

## Current Status

GitHub Releases are fully automated via [`.github/workflows/release.yml`](.github/workflows/release.yml). Pushing a `v*.*.*` tag triggers builds for:

| Platform | Format | Status |
|----------|--------|--------|
| macOS ARM64 | `.dmg` | ✅ Automated |
| macOS x64 | `.dmg` | ✅ Automated |
| Linux x64 | `.deb`, `.AppImage` | ✅ Automated |
| Windows x64 | `.msi`, `.exe` (NSIS) | ✅ Automated |

## GitHub Releases (Primary)

```bash
# 1. Bump version
npm version patch   # or minor / major

# 2. Push tag — CI builds and drafts a release
git push origin --tags
```

The release is drafted automatically. Go to the [Releases page](https://github.com/zosmaai/pi-cowork/releases) to publish it.

---

## Package Managers (Roadmap)

### macOS — Homebrew

Requires a custom tap (`homebrew-zosmaai`) or submission to `homebrew/cask`.

```ruby
# Formula for homebrew-zosmaai/pi-cowork.rb
cask "pi-cowork" do
  version "0.1.0"
  sha256 "..."

  url "https://github.com/zosmaai/pi-cowork/releases/download/v#{version}/Pi.Cowork_#{version}_aarch64.dmg"
  name "Pi Cowork"
  desc "Desktop GUI for the pi coding agent"
  homepage "https://github.com/zosmaai/pi-cowork"

  app "Pi Cowork.app"
end
```

Install: `brew install --cask zosmaai/tap/pi-cowork`

### Windows — Winget

Submit a manifest to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs):

```yaml
# PiCowork.PiCowork.yaml
PackageIdentifier: ZosmaAI.PiCowork
PackageVersion: 0.1.0
InstallerType: msi
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/zosmaai/pi-cowork/releases/download/v0.1.0/Pi.Cowork_0.1.0_x64_en-US.msi
    InstallerSha256: ...
ManifestType: singleton
ManifestVersion: 1.0.0
```

Install: `winget install ZosmaAI.PiCowork`

### Windows — Chocolatey

Requires a `.nuspec` + PowerShell install script, pushed to [chocolatey.org](https://chocolatey.org):

```powershell
# choco install pi-cowork
```

### Windows — Scoop

Add to a custom bucket or [Scoop Extras](https://github.com/ScoopInstaller/Extras):

```json
{
  "version": "0.1.0",
  "url": "https://github.com/zosmaai/pi-cowork/releases/download/v0.1.0/Pi.Cowork_0.1.0_x64-setup.exe",
  "bin": "Pi Cowork.exe"
}
```

Install: `scoop install pi-cowork`

### Linux — AUR (Arch)

Create a `PKGBUILD` and submit to AUR:

```bash
# PKGBUILD
pkgname=pi-cowork-bin
pkgver=0.1.0
pkgrel=1
pkgdesc="Desktop GUI for the pi coding agent"
arch=('x86_64')
url="https://github.com/zosmaai/pi-cowork"
license=('MIT')
source=("$pkgname-$pkgver.deb::$url/releases/download/v$pkgver/pi-cowork_${pkgver}_amd64.deb")
sha256sums=('...')

package() {
  bsdtar -xf data.tar.* -C "$pkgdir"
}
```

Install: `yay -S pi-cowork-bin`

### Linux — Flatpak

Requires a `flatpak-builder` manifest + Flathub submission:

```yaml
# ai.zosma.PiCowork.yml
app-id: ai.zosma.PiCowork
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: pi-cowork
modules:
  - name: pi-cowork
    buildsystem: simple
    sources:
      - type: archive
        url: https://github.com/zosmaai/pi-cowork/releases/download/v0.1.0/pi-cowork-x86_64.tar.gz
        sha256: ...
```

Install: `flatpak install flathub ai.zosma.PiCowork`

### Linux — Snap

Requires a `snapcraft.yaml` and Snap Store registration:

```yaml
name: pi-cowork
version: '0.1.0'
base: core22
grade: stable
confinement: strict
parts:
  pi-cowork:
    plugin: dump
    source: https://github.com/zosmaai/pi-cowork/releases/download/v0.1.0/pi-cowork_0.1.0_amd64.deb
apps:
  pi-cowork:
    command: usr/bin/pi-cowork
```

Install: `snap install pi-cowork`

---

## App Stores

| Store | Requirements | Effort |
|-------|-------------|--------|
| Mac App Store | Apple Developer ($99/yr), code signing, sandboxing | High |
| Microsoft Store | MSIX packaging, code signing | Medium |
| Snap Store | Snapcraft registration | Low |
| Flathub | Flatpak manifest review | Medium |

---

## CrabNebula Cloud

[CrabNebula](https://crabnebula.dev/cloud) offers CDN-backed distribution with:
- Multi-channel releases (stable, beta, nightly)
- Update mechanisms
- Download analytics
- Code signing as a service

```bash
npm install -g @crabnebula/cli
cn release upload --app pi-cowork --version 0.1.0 ./src-tauri/target/release/bundle/
```

---

## Recommended Priority

1. **GitHub Releases** — ✅ Done, primary channel
2. **Homebrew (macOS)** — High priority, dev-friendly
3. **Winget (Windows)** — High priority, built into Windows 11
4. **AUR (Arch Linux)** — Medium priority, dev-friendly
5. **Scoop (Windows)** — Medium priority
6. **Flatpak (Linux)** — Medium priority, universal
7. **Chocolatey (Windows)** — Lower priority, overlap with Winget
8. **Snap (Linux)** — Lower priority, Canonical-specific
9. **App Stores** — Consider once codebase stabilizes

---

## Resources

- [Tauri Distribution Guide](https://tauri.app/distribute)
- [Homebrew Cask Docs](https://docs.brew.sh/Cask-Cookbook)
- [Winget Manifest Docs](https://learn.microsoft.com/en-us/windows/package-manager/package)
- [Flathub Submission](https://docs.flathub.org/docs/for-app-authors/submission/)
- [CrabNebula Cloud](https://docs.crabnebula.dev/cloud/)
