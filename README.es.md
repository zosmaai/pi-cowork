# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | **Español** | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Un GUI de escritorio para el [agente de codificación pi](https://github.com/badlogic/pi-mono) — transmisión en tiempo real, procesos de pensamiento, llamadas a herramientas y dirección, todo en una hermosa aplicación nativa.

![pi-cowork-captura](./assets/screenshot.png)

## Características

- **Respuestas en streaming** — Observa a pi pensar, escribir y llamar herramientas en tiempo real
- **Bloques de pensamiento** — Razonamiento expandible del modelo
- **Tarjetas de ejecución de herramientas** — Llamadas bash/edit/write en tiempo real con argumentos y resultados
- **Gestión de sesiones** — Sesiones de chat persistentes con marcas de tiempo
- **Modo claro y oscuro** — Modo claro crema cálido y modo oscuro carbón cálido
- **Atajos de teclado** — `Cmd/Ctrl+Shift+K` para enfocar, `Cmd/Ctrl+N` para nueva sesión
- **Abortar y reintentar** — Detener un agente en ejecución, reintentar en errores
- **UI inspirada en Claude** — Diseño de tres columnas con barra lateral, espacio de trabajo y panel de información

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Pruebas | Vitest, Testing Library, jsdom |
| Linter | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Inicio rápido

### Prerrequisitos

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Instalar y ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo frontend
npm run dev:frontend

# Ejecutar aplicación Tauri completa (frontend + backend Rust)
npm run dev
```

## Licencia

MIT © [Zosma AI](https://zosma.ai)
