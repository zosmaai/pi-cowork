# Pi Cowork

[English](./README.md) | **中文** | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [pi coding agent](https://github.com/badlogic/pi-mono) 的桌面 GUI — 实时流式传输、思维过程、工具调用和引导，全部集成在一个精美的原生应用中。

![pi-cowork-截图](./assets/screenshot.png)

## 功能特性

- **流式响应** — 实时观看 pi 思考、编写代码和调用工具
- **思维块** — 可展开查看模型的推理过程
- **工具执行卡片** — 实时显示 bash/edit/write 工具调用及其参数和结果
- **会话管理** — 带时间戳的持久聊天会话
- **亮色与暗色模式** — 暖色奶油亮模式和暖色炭灰暗模式
- **键盘快捷键** — `Cmd/Ctrl+Shift+K` 聚焦输入框，`Cmd/Ctrl+N` 新建会话
- **中止与重试** — 停止正在运行的代理，出错时重试
- **Claude 风格 UI** — 三栏布局：侧边栏、工作区和信息面板

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, Tailwind CSS v4, Radix UI |
| 后端 | Tauri v2, Rust, Tokio |
| 测试 | Vitest, Testing Library, jsdom |
| 代码规范 | Biome |
| 命令行 | pi coding agent (`@mariozechner/pi-coding-agent`) |

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### 安装与运行

```bash
# 安装依赖
npm install

# 运行前端开发服务器
npm run dev:frontend

# 运行完整 Tauri 应用（前端 + Rust 后端）
npm run dev
```

## 许可证

MIT © [Zosma AI](https://zosma.ai)
