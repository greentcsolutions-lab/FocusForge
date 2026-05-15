# ⚡ FocusForge

> Pomodoro timer + 35-day activity heatmap. No login. No fluff. Pure focus.

---

## What Is It?

FocusForge is a minimal, beautiful Pomodoro timer with a GitHub-style activity heatmap built right in. It lives in your browser, saves your sessions automatically, and gives you an at-a-glance view of your focus habits over the past 35 days — no account, no tracking, no distractions.

Built for developers, writers, students, and anyone who needs focus without friction.

---

## Features

- ⏱ **25/5 Pomodoro Timer** — Configurable work/break durations (1–90 min work, 1–30 min break)
- 🔥 **35-Day Heatmap** — GitHub-style activity grid showing session intensity per day
- 📋 **Task Queue** — Add tasks, mark them done, and track how many Pomodoros each took
- 🎯 **Active Task Tracking** — Tap any task to set it as active; Pomodoro completions are automatically credited
- 📊 **Live Stats** — Today's sessions, all-time total, and current day-streak
- 🔔 **Browser Notifications** — Optional desktop alerts when sessions complete
- 🔊 **Web Audio Chimes** — Satisfying completion tones (no CDN, pure Web Audio API)
- ⌨️ **Keyboard Shortcuts** — `Space` to start/pause, `R` to reset
- 🌗 **Dark / Light Mode** — Persisted across sessions
- 💾 **Offline-first** — 100% localStorage, zero server dependency
- 📤 **One-click Share** — Copies your GitHub Pages URL to clipboard
- 📱 **Mobile-responsive** — Works on every screen size

---

## Live Demo

> **[https://YOUR-USERNAME.github.io/focus-forge](https://YOUR-USERNAME.github.io/focus-forge)**
> *(fill in after deploying to GitHub Pages)*

---

## Tech Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| HTML/CSS    | Vanilla HTML5 + Custom CSS      |
| Fonts       | IBM Plex Mono + IBM Plex Sans (Google Fonts) |
| JS          | Vanilla ES6+ (no build step)    |
| Storage     | localStorage                    |
| Audio       | Web Audio API (no CDN)          |
| Hosting     | GitHub Pages (static)           |

No frameworks. No build tools. No dependencies. Open `index.html` and it works.

---

## Deploying to GitHub Pages

```bash
# 1. Create a new repo on GitHub (e.g. focus-forge)
git init
git add .
git commit -m "Initial commit — FocusForge MVP"
git remote add origin https://github.com/YOUR-USERNAME/focus-forge.git
git push -u origin main

# 2. In GitHub: Settings → Pages → Source: main branch → / (root)
# Your app will be live at: https://YOUR-USERNAME.github.io/focus-forge
```

---

## Roadmap / Pro Ideas

- [ ] Custom notification sounds (file upload)
- [ ] Export sessions as CSV
- [ ] Weekly/monthly report summary
- [ ] Custom Pomodoro presets (Deep Work 90 min, Quick Sprint 15 min)
- [ ] "Remove watermark" Pro tier
- [ ] Embeddable `<script>` widget for any webpage
- [ ] PWA / installable app support

---

## License

MIT — do whatever you want with it.

---

Created by **[Chris Green](https://x.com/thechrisgreen)**
