# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | **Русский** | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Десктопный ИИ-коллега на базе [SDK pi agent](https://github.com/Dicklesworthstone/pi_agent_rust) — потоковая передача, процессы мышления, вызовы инструментов, мультитурновые сессии и управление, всё в красивом нативном приложении.

![pi-cowork-скриншот](./assets/screenshot.png)

## Возможности

- **Внутрипроцессная среда агента** — SDK pi agent работает прямо внутри приложения (без подпроцессов, без зависимости от CLI во время выполнения)
- **Мультитурновые сессии** — Полная преемственность разговоров с постоянной историей сессий
- **Потоковые ответы** — Наблюдайте, как агент думает, пишет и вызывает инструменты в реальном времени
- **Блоки мышления** — Раскрываемый процесс рассуждения модели
- **Шкала вызовов инструментов** — Живые bash/edit/write вызовы с аргументами и результатами
- **Управление сессиями** — Постоянные чат-сессии сохраняются в `~/.pi/cowork/`
- **Светлый и тёмный режим** — Тёплый кремовый светлый и тёплый угольный тёмный режим
- **Горячие клавиши** — `Cmd/Ctrl+Shift+K` для фокуса, `Cmd/Ctrl+N` для новой сессии
- **Прервать и управлять** — Остановить запущенный агент в середине хода, отправить последующие управляющие сообщения
- **UI вдохновлённый Claude** — 3-колоночный макет с боковой панелью, рабочей областью и информационной панелью

## Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Десктопная оболочка | Tauri v2, Rust, Tokio |
| Движок агента | [metaagents](./metaagents/) — Rust-обёртка SDK `pi_agent_rust` |
| SDK агента | [`pi_agent_rust`](https://github.com/Dicklesworthstone/pi_agent_rust) — внутрипроцессная среда с расширениями QuickJS |
| Тестирование | Vitest, Testing Library, jsdom, `cargo test` |
| Линтер | Biome (frontend), Clippy (Rust) |

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) 1.85+
- [pi coding agent](https://github.com/Dicklesworthstone/pi_agent_rust) — установите один раз для начальной настройки: `npm install -g @mariozechner/pi-coding-agent`, затем запустите `pi` один раз для генерации `~/.pi/agent/settings.json` и `~/.pi/agent/models.json`

> **Примечание:** CLI pi нужен только для начальной настройки. Приложение использует SDK `pi_agent_rust` напрямую во время выполнения — никаких подпроцессов или вызовов CLI при нормальной работе.

### Установка и запуск

```bash
# Установить зависимости
npm install

# Запустить frontend сервер разработки
npm run dev:frontend

# Запустить полное Tauri приложение (frontend + Rust backend + движок metaagents)
npm run dev
```

## Конфигурация и данные

| Что | Расположение | Примечания |
|-----|-------------|-----------|
| LLM-провайдеры и API-ключи | `~/.pi/agent/settings.json` | Создаётся `pi` при первом запуске |
| Определения моделей | `~/.pi/agent/models.json` | Создаётся `pi` при первом запуске |
| Расширения и навыки | `~/.pi/agent/extensions/` | Устанавливаются через `pi install` |
| История сессий | `~/.pi/cowork/` | Управляется pi-cowork |

## Лицензия

MIT © [Zosma AI](https://zosma.ai)
