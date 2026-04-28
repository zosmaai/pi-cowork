# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | **日本語** | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [pi coding agent](https://github.com/badlogic/pi-mono) のデスクトップ GUI — ストリーミング、思考プロセス、ツール呼び出し、ステアリングをすべて美しいネイティブアプリに統合。

![pi-cowork-スクリーンショット](./assets/screenshot.png)

## 機能

- **ストリーミングレスポンス** — pi が考え、書き、ツールを呼び出すのをリアルタイムで確認
- **思考ブロック** — 展開可能なモデルの推論プロセス
- **ツール実行カード** — bash/edit/write ツール呼び出しを引数と結果付きでリアルタイム表示
- **セッション管理** — タイムスタンプ付きの永続的なチャットセッション
- **ライト＆ダークモード** — 温かみのあるクリームライトモードとチャコールダークモード
- **キーボードショートカット** — `Cmd/Ctrl+Shift+K` でフォーカス、`Cmd/Ctrl+N` で新規セッション
- **中止と再試行** — 実行中のエージェントを停止、エラー時に再試行
- **Claude 風 UI** — サイドバー、ワークスペース、情報パネルの 3 列レイアウト

## 技術スタック

| レイヤー | テクノロジー |
|---------|------------|
| フロントエンド | React 19, Tailwind CSS v4, Radix UI |
| バックエンド | Tauri v2, Rust, Tokio |
| テスト | Vitest, Testing Library, jsdom |
| リンター | Biome |
| シェル | pi coding agent (`@mariozechner/pi-coding-agent`) |

## クイックスタート

### 前提条件

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### インストールと実行

```bash
# 依存関係のインストール
npm install

# フロントエンド開発サーバーの実行
npm run dev:frontend

# フル Tauri アプリの実行（フロントエンド + Rust バックエンド）
npm run dev
```

## ライセンス

MIT © [Zosma AI](https://zosma.ai)
