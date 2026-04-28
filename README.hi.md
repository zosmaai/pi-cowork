# Pi Cowork

[English](./README.md) | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | **हिंदी**

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [pi coding agent](https://github.com/badlogic/pi-mono) के लिए एक डेस्कटॉप GUI — स्ट्रीमिंग, सोच की प्रक्रिया, टूल कॉल और स्टीयरिंग, सब कुछ एक सुंदर नेटिव ऐप में।

![pi-cowork-स्क्रीनशॉट](./assets/screenshot.png)

## विशेषताएँ

- **स्ट्रीमिंग प्रतिक्रियाएँ** — pi को सोचते, लिखते और टूल कॉल करते हुए रीयल-टाइम में देखें
- **थिंकिंग ब्लॉक** — मॉडल का विस्तार योग्य तर्क
- **टूल एक्जीक्यूशन कार्ड** — आर्ग्युमेंट और परिणामों के साथ लाइव bash/edit/write टूल कॉल
- **सेशन मैनेजमेंट** — टाइमस्टैम्प के साथ लगातार चैट सेशन
- **लाइट और डार्क मोड** — गर्म क्रीम लाइट मोड और गर्म चारकोल डार्क मोड
- **कीबोर्ड शॉर्टकट** — फोकस के लिए `Cmd/Ctrl+Shift+K`, नए सेशन के लिए `Cmd/Ctrl+N`
- **एबॉर्ट और रीट्राई** — चल रहे एजेंट को रोकें, त्रुटि पर पुनः प्रयास करें
- **Claude-प्रेरित UI** — साइडबार, वर्कस्पेस और इन्फो पैनल के साथ 3-कॉलम लेआउट

## तकनीकी स्टैक

| परत | तकनीक |
|-----|-------|
| फ्रंटएंड | React 19, Tailwind CSS v4, Radix UI |
| बैकएंड | Tauri v2, Rust, Tokio |
| टेस्टिंग | Vitest, Testing Library, jsdom |
| लिंटर | Biome |
| शेल | pi coding agent (`@mariozechner/pi-coding-agent`) |

## त्वरित शुरुआत

### पूर्वापेक्षाएँ

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### इंस्टॉल और रन

```bash
# निर्भरताएँ इंस्टॉल करें
npm install

# फ्रंटएंड डेवलपमेंट सर्वर चलाएँ
npm run dev:frontend

# पूरी Tauri ऐप चलाएँ (फ्रंटएंड + Rust बैकएंड)
npm run dev
```

## लाइसेंस

MIT © [Zosma AI](https://zosma.ai)
