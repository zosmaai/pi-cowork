# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | **한국어** | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [pi agent SDK](https://github.com/Dicklesworthstone/pi_agent_rust)로 구동되는 데스크톱 AI 동료 — 스트리밍, 사고 과정, 도구 호출, 멀티턴 세션 및 스티어링을 모두 아름다운 네이티브 앱에 통합했습니다.

![pi-cowork-스크린샷](./assets/screenshot.png)

## 기능

- **인프로세스 에이전트 런타임** — pi agent SDK가 앱 내에서 직접 실행 (서브프로세스 없음, 런타임 시 CLI 의존성 없음)
- **멀티턴 세션** — 영구 세션 기록으로 완전한 대화 연속성
- **스트리밍 응답** — 에이전트가 생각하고, 쓰고, 도구를 호출하는 것을 실시간으로 확인
- **사고 블록** — 확장 가능한 모델의 추론 과정
- **도구 호출 타임라인** — 인수와 결과가 포함된 실시간 bash/edit/write 도구 호출
- **세션 관리** — `~/.pi/cowork/`에 저장되는 지속적인 채팅 세션
- **라이트 & 다크 모드** — 따뜻한 크림 라이트 모드와 따뜻한 차콜 다크 모드
- **키보드 단축키** — `Cmd/Ctrl+Shift+K`로 포커스, `Cmd/Ctrl+N`으로 새 세션
- **중단 및 스티어링** — 턴 중간에 실행 중인 에이전트 중지, 후속 스티어링 메시지 전송
- **Claude 스타일 UI** — 사이드바, 작업 공간, 정보 패널이 있는 3열 레이아웃

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, Tailwind CSS v4, Radix UI |
| 데스크톱 셸 | Tauri v2, Rust, Tokio |
| 에이전트 엔진 | [metaagents](./metaagents/) — `pi_agent_rust` SDK의 Rust 래퍼 |
| 에이전트 SDK | [`pi_agent_rust`](https://github.com/Dicklesworthstone/pi_agent_rust) — QuickJS 확장 포함 인프로세스 런타임 |
| 테스트 | Vitest, Testing Library, jsdom, `cargo test` |
| 린터 | Biome (프론트엔드), Clippy (Rust) |

## 빠른 시작

### 전제 조건

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) 1.85+
- [pi coding agent](https://github.com/Dicklesworthstone/pi_agent_rust) — 초기 설정을 위해 한 번 설치: `npm install -g @mariozechner/pi-coding-agent`, 그 후 `pi`를 한 번 실행하여 `~/.pi/agent/settings.json` 및 `~/.pi/agent/models.json` 생성

> **참고:** pi CLI는 초기 설정에만 필요합니다. 앱은 런타임에 `pi_agent_rust` SDK를 직접 사용합니다 — 정상 작동 중에는 서브프로세스나 CLI 호출이 필요하지 않습니다.

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 프론트엔드 개발 서버 실행
npm run dev:frontend

# 전체 Tauri 앱 실행 (프론트엔드 + Rust 백엔드 + metaagents 엔진)
npm run dev
```

## 설정 및 데이터

| 항목 | 위치 | 참고 |
|------|------|------|
| LLM 제공자 및 API 키 | `~/.pi/agent/settings.json` | 첫 `pi` 실행 시 생성 |
| 모델 정의 | `~/.pi/agent/models.json` | 첫 `pi` 실행 시 생성 |
| 확장 및 스킬 | `~/.pi/agent/extensions/` | `pi install`로 설치 |
| 세션 기록 | `~/.pi/cowork/` | pi-cowork에서 관리 |

## 라이선스

MIT © [Zosma AI](https://zosma.ai)
