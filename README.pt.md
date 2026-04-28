# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | **Português** | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Uma GUI de desktop para o [agente de codificação pi](https://github.com/badlogic/pi-mono) — streaming, processos de pensamento, chamadas de ferramentas e direcionamento, tudo em um belo aplicativo nativo.

![pi-cowork-captura](./assets/screenshot.png)

## Funcionalidades

- **Respostas em streaming** — Veja o pi pensar, escrever e chamar ferramentas em tempo real
- **Blocos de pensamento** — Raciocínio expansível do modelo
- **Cartões de execução de ferramentas** — Chamadas bash/edit/write em tempo real com argumentos e resultados
- **Gerenciamento de sessões** — Sessões de chat persistentes com timestamps
- **Modo claro e escuro** — Modo claro creme quente e modo escuro carvão quente
- **Atalhos de teclado** — `Cmd/Ctrl+Shift+K` para focar, `Cmd/Ctrl+N` para nova sessão
- **Abortar e tentar novamente** — Pare um agente em execução, tente novamente em erros
- **UI inspirada no Claude** — Layout de 3 colunas com barra lateral, espaço de trabalho e painel de informações

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Testes | Vitest, Testing Library, jsdom |
| Linter | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Início Rápido

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Instalar e Executar

```bash
# Instalar dependências
npm install

# Executar servidor de desenvolvimento frontend
npm run dev:frontend

# Executar aplicativo Tauri completo (frontend + backend Rust)
npm run dev
```

## Licença

MIT © [Zosma AI](https://zosma.ai)
