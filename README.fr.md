# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | **Français** | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Une interface graphique de bureau pour l'[agent de codage pi](https://github.com/badlogic/pi-mono) — streaming, processus de pensée, appels d'outils et pilotage, le tout dans une belle application native.

![pi-cowork-capture](./assets/screenshot.png)

## Fonctionnalités

- **Réponses en streaming** — Observez pi penser, écrire et appeler des outils en temps réel
- **Blocs de pensée** — Raisonnement extensible du modèle
- **Cartes d'exécution d'outils** — Appels bash/edit/write en direct avec arguments et résultats
- **Gestion de sessions** — Sessions de chat persistantes avec horodatages
- **Mode clair & sombre** — Mode clair crème chaude et mode sombre charbon chaud
- **Raccourcis clavier** — `Cmd/Ctrl+Shift+K` pour focus, `Cmd/Ctrl+N` pour nouvelle session
- **Arrêter & réessayer** — Arrêtez un agent en cours, réessayez en cas d'erreur
- **UI inspirée de Claude** — Layout à 3 colonnes avec barre latérale, espace de travail et panneau d'info

## Stack Technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Tests | Vitest, Testing Library, jsdom |
| Linter | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Démarrage Rapide

### Prérequis

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Installer & Exécuter

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement frontend
npm run dev:frontend

# Exécuter l'application Tauri complète (frontend + backend Rust)
npm run dev
```

## Licence

MIT © [Zosma AI](https://zosma.ai)
