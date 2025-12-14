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
- **Stability & Exports** — Atomic saves and auto-export capabilities

## 📥 Installation

Download the latest release for your platform from the **[Releases Page](https://github.com/gaurav-pathrabe/PLAN/releases)**.

### Windows
1. Download `planner.exe`.
2. Move it to your desktop or any preferred folder.
3. Double-click to run.

### macOS
Since the app is not signed with an Apple Developer ID ($99/yr), macOS will initially block it. Here is how to run it:

1. Download `planner-macos.zip`.
2. Double-click to extract it. You will see `planner.app`.
3. Drag `planner.app` to your **Applications** folder.
4. **Important**: 
   - **Right-click** (or Control-click) `planner.app` and select **Open**.
   - Click **Open** in the dialog box that appears.
   - *Note: If you double-click normally, you may see an "App is damaged" or "Unidentified developer" error. Just use Right-click > Open the first time.*

### Linux
1. Download `planner`.
2. Make it executable: `chmod +x planner`
3. Run it: `./planner`

## 📁 Data Storage

Your data (tasks, history, settings) is stored locally:
- **Windows:** `C:\Users\<YourName>\.plan\data.json`
- **macOS/Linux:** `~/.plan/data.json`

Exports are saved to your configured export folder (default: `Downloads/PLAN_Exports`).

## 🔧 Manual Build (Development)

If you prefer to build it yourself:

### Prerequisites
- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/gaurav-pathrabe/PLAN.git
   cd PLAN
   ```

2. Run in development mode (hot reload):
   ```bash
   wails dev
   ```

3. Build for production:
   ```bash
   # Windows
   wails build -platform windows/amd64

   # macOS
   wails build -platform darwin/universal
   ```

## 🛠️ Built With

- [Wails](https://wails.io/) — Go + Web Technologies
- [React](https://react.dev/) — Frontend UI
- [TypeScript](https://www.typescriptlang.org/) — Type-safe JavaScript

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

*A quiet place to plan, reflect, and grow.*
