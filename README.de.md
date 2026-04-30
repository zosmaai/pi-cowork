# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | **Deutsch** | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Ein Desktop-KI-Mitarbeiter, angetrieben vom [pi agent SDK](https://github.com/Dicklesworthstone/pi_agent_rust) — Streaming, Denkprozesse, Tool-Aufrufe, Multi-Turn-Sitzungen und Steuerung, alles in einer schönen nativen App.

![pi-cowork-screenshot](./assets/screenshot.png)

## Funktionen

- **In-Process-Agenten-Laufzeit** — Das pi agent SDK läuft direkt in der App (kein Subprozess, keine CLI-Abhängigkeit zur Laufzeit)
- **Multi-Turn-Sitzungen** — Volle Gesprächskontinuität mit persistentem Sitzungsverlauf
- **Streaming-Antworten** — Beobachte den Agenten in Echtzeit beim Denken, Schreiben und Tool-Aufrufen
- **Denkblöcke** — Erweiterbares Modell-Reasoning
- **Tool-Aufruf-Zeitleiste** — Live bash/edit/write Tool-Aufrufe mit Argumenten und Ergebnissen
- **Sitzungsverwaltung** — Persistente Chat-Sitzungen gespeichert in `~/.pi/cowork/`
- **Hell- & Dunkelmodus** — Warmer Creme-Hellmodus und warmer Kohle-Dunkelmodus
- **Tastaturkürzel** — `Cmd/Ctrl+Shift+K` zum Fokussieren, `Cmd/Ctrl+N` für neue Sitzung
- **Abbrechen & Steuern** — Laufenden Agenten mid-turn stoppen, Folge-Steuerungsnachrichten senden
- **Claude-inspirierte UI** — 3-Spalten-Layout mit Seitenleiste, Arbeitsbereich und Infopanel

## Technologie-Stack

| Ebene | Technologie |
|-------|------------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Desktop-Shell | Tauri v2, Rust, Tokio |
| Agenten-Engine | [metaagents](./metaagents/) — Rust-Wrapper um das `pi_agent_rust` SDK |
| Agenten-SDK | [`pi_agent_rust`](https://github.com/Dicklesworthstone/pi_agent_rust) — In-Process-Laufzeit mit QuickJS-Erweiterungen |
| Tests | Vitest, Testing Library, jsdom, `cargo test` |
| Linter | Biome (Frontend), Clippy (Rust) |

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) 1.85+
- [pi coding agent](https://github.com/Dicklesworthstone/pi_agent_rust) — Einmal installieren zur Ersteinrichtung: `npm install -g @mariozechner/pi-coding-agent`, dann `pi` einmal ausführen um `~/.pi/agent/settings.json` und `~/.pi/agent/models.json` zu erzeugen

> **Hinweis:** Die pi CLI wird nur für die Ersteinrichtung benötigt. Die App nutzt das `pi_agent_rust` SDK direkt zur Laufzeit — keine Subprozesse oder CLI-Aufrufe während des normalen Betriebs.

### Installieren & Ausführen

```bash
# Abhängigkeiten installieren
npm install

# Frontend-Entwicklungsserver starten
npm run dev:frontend

# Vollständige Tauri-App ausführen (Frontend + Rust-Backend + metaagents Engine)
npm run dev
```

## Konfiguration & Daten

| Was | Speicherort | Hinweise |
|-----|-------------|----------|
| LLM-Anbieter & API-Schlüssel | `~/.pi/agent/settings.json` | Von `pi` beim ersten Lauf erstellt |
| Modelldefinitionen | `~/.pi/agent/models.json` | Von `pi` beim ersten Lauf erstellt |
| Erweiterungen & Skills | `~/.pi/agent/extensions/` | Installiert via `pi install` |
| Sitzungsverlauf | `~/.pi/cowork/` | Verwaltet von pi-cowork |

## Lizenz

MIT © [Zosma AI](https://zosma.ai)
