# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | **Русский** | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Десктопный GUI для [агента кодирования pi](https://github.com/badlogic/pi-mono) — потоковая передача, процессы мышления, вызовы инструментов и управление, всё в красивом нативном приложении.

![pi-cowork-скриншот](./assets/screenshot.png)

## Возможности

- **Потоковые ответы** — Наблюдайте, как pi думает, пишет и вызывает инструменты в реальном времени
- **Блоки мышления** — Раскрываемый процесс рассуждения модели
- **Карточки выполнения инструментов** — Live bash/edit/write вызовы с аргументами и результатами
- **Управление сессиями** — Постоянные чат-сессии с временными метками
- **Светлый и тёмный режим** — Тёплый кремовый светлый и тёплый угольный тёмный режим
- **Горячие клавиши** — `Cmd/Ctrl+Shift+K` для фокуса, `Cmd/Ctrl+N` для новой сессии
- **Прервать и повторить** — Остановить запущенный агент, повторить при ошибке
- **UI вдохновлённый Claude** — 3-колоночный макет с боковой панелью, рабочей областью и информационной панелью

## Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Тестирование | Vitest, Testing Library, jsdom |
| Линтер | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Установка и запуск

```bash
# Установить зависимости
npm install

# Запустить frontend сервер разработки
npm run dev:frontend

# Запустить полное Tauri приложение (frontend + Rust backend)
npm run dev
```

## Лицензия

MIT © [Zosma AI](https://zosma.ai)
