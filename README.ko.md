# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | **한국어** | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [pi coding agent](https://github.com/badlogic/pi-mono)의 데스크톱 GUI — 스트리밍, 사고 과정, 도구 호출 및 스티어링을 모두 아름다운 네이티브 앱에 통합했습니다.

![pi-cowork-스크린샷](./assets/screenshot.png)

## 기능

- **스트리밍 응답** — pi가 생각하고, 쓰고, 도구를 호출하는 것을 실시간으로 확인
- **사고 블록** — 확장 가능한 모델의 추론 과정
- **도구 실행 카드** — 인수와 결과가 포함된 실시간 bash/edit/write 도구 호출
- **세션 관리** — 타임스탬프가 있는 지속적인 채팅 세션
- **라이트 & 다크 모드** — 따뜻한 크림 라이트 모드와 따뜻한 차콜 다크 모드
- **키보드 단축키** — `Cmd/Ctrl+Shift+K`로 포커스, `Cmd/Ctrl+N`으로 새 세션
- **중단 및 재시도** — 실행 중인 에이전트 중지, 오류 시 재시도
- **Claude 스타일 UI** — 사이드바, 작업 공간, 정보 패널이 있는 3열 레이아웃

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, Tailwind CSS v4, Radix UI |
| 백엔드 | Tauri v2, Rust, Tokio |
| 테스트 | Vitest, Testing Library, jsdom |
| 린터 | Biome |
| 셸 | pi coding agent (`@mariozechner/pi-coding-agent`) |

## 빠른 시작

### 전제 조건

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 프론트엔드 개발 서버 실행
npm run dev:frontend

# 전체 Tauri 앱 실행 (프론트엔드 + Rust 백엔드)
npm run dev
```

## 라이선스

MIT © [Zosma AI](https://zosma.ai)
