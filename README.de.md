# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | **Deutsch** | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Ein Desktop-GUI für den [pi coding agent](https://github.com/badlogic/pi-mono) — Streaming, Denkprozesse, Tool-Aufrufe und Steuerung, alles in einer schönen nativen App.

![pi-cowork-screenshot](./assets/screenshot.png)

## Funktionen

- **Streaming-Antworten** — Beobachte pi in Echtzeit beim Denken, Schreiben und Tool-Aufrufen
- **Denkblöcke** — Erweiterbares Modell-Reasoning
- **Tool-Ausführungskarten** — Live bash/edit/write Tool-Aufrufe mit Argumenten und Ergebnissen
- **Sitzungsverwaltung** — Persistente Chat-Sitzungen mit Zeitstempeln
- **Hell- & Dunkelmodus** — Warmer Creme-Hellmodus und warmer Kohle-Dunkelmodus
- **Tastaturkürzel** — `Cmd/Ctrl+Shift+K` zum Fokussieren, `Cmd/Ctrl+N` für neue Sitzung
- **Abbrechen & Wiederholen** — Stoppe einen laufenden Agenten, wiederhole bei Fehlern
- **Claude-inspirierte UI** — 3-Spalten-Layout mit Seitenleiste, Arbeitsbereich und Infopanel

## Technologie-Stack

| Ebene | Technologie |
|-------|------------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Tests | Vitest, Testing Library, jsdom |
| Linter | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Installieren & Ausführen

```bash
# Abhängigkeiten installieren
npm install

# Frontend-Entwicklungsserver starten
npm run dev:frontend

# Vollständige Tauri-App ausführen (Frontend + Rust-Backend)
npm run dev
```

## Lizenz

MIT © [Zosma AI](https://zosma.ai)
