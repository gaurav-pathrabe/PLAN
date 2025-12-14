# PLAN

A calm, private, time-aware weekly planner that helps you see your effort across days, weeks, months, and years — without pressure or noise.

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)

## ✨ Features

- **Named Tasks** — Create custom daily tasks (Morning Routine, Deep Work, etc.)
- **Weekly Planner** — Check off tasks for each day of the week
- **Progress Reports** — See weekly, monthly, and yearly completion charts
- **Light/Dark Mode** — Easy on the eyes, day or night
- **100% Private** — All data stored locally on your computer

## 📥 Download

Download the latest release for your platform:

**[→ Download from Releases](https://github.com/gaurav-pathrabe/PLAN/releases)**

| Platform | File |
|----------|------|
| Windows | `planner.exe` |
| macOS | `planner.app` |
| Linux | `planner` |

Just download, double-click, and start planning!

## 📸 Screenshots

*Coming soon*

## 🔧 Development

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Run in dev mode

```bash
wails dev
```

### Build for production

```bash
wails build -platform windows/amd64
wails build -platform darwin/universal
wails build -platform linux/amd64
```

## 📁 Data Storage

Your data is stored locally at:
- **Windows:** `C:\Users\<YourName>\.plan\data.json`
- **macOS/Linux:** `~/.plan/data.json`

To transfer data between computers, simply copy the `.plan` folder.

## 🛠️ Built With

- [Wails](https://wails.io/) — Go + Web Technologies
- [React](https://react.dev/) — Frontend UI
- [TypeScript](https://www.typescriptlang.org/) — Type-safe JavaScript

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

*A quiet place to plan, reflect, and grow.*
