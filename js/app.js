// ============================================================
// FocusForge — Pomodoro + Task Heatmap
// Created by Chris Green
// ============================================================

const APP_KEY = 'focusforge_v1';

// ─── State ───────────────────────────────────────────────────
let state = {
  mode: 'work',           // 'work' | 'break'
  running: false,
  secondsLeft: 25 * 60,
  sessionsDone: 0,
  tasks: [],
  sessions: {},           // { 'YYYY-MM-DD': count }
  activeTaskId: null,
  customWork: 25,
  customBreak: 5,
};

let ticker = null;
let wakeLock = null;

// ─── Persistence ─────────────────────────────────────────────
function save() {
  const toSave = {
    sessions: state.sessions,
    tasks: state.tasks,
    sessionsDone: state.sessionsDone,
    customWork: state.customWork,
    customBreak: state.customBreak,
  };
  localStorage.setItem(APP_KEY, JSON.stringify(toSave));
}

function load() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.sessions = data.sessions || {};
    state.tasks = data.tasks || [];
    state.sessionsDone = data.sessionsDone || 0;
    state.customWork = data.customWork || 25;
    state.customBreak = data.customBreak || 5;
  } catch (e) {
    console.warn('FocusForge: Could not load saved data', e);
  }
}

// ─── Timer Core ───────────────────────────────────────────────
function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getWorkSecs() { return state.customWork * 60; }
function getBreakSecs() { return state.customBreak * 60; }

function setTimerDisplay() {
  document.getElementById('timer-display').textContent = formatTime(state.secondsLeft);
  document.title = `${formatTime(state.secondsLeft)} — FocusForge`;

  // Progress ring: dashoffset 0 = full stroke visible, circumference = empty
  const total = state.mode === 'work' ? getWorkSecs() : getBreakSecs();
  const pct = 1 - (state.secondsLeft / total);
  const ring = document.getElementById('progress-ring');
  const circumference = 339.29; // 2π × 54
  ring.style.strokeDashoffset = circumference * pct;
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  updateStartStopBtn();
  requestWakeLock();

  ticker = setInterval(() => {
    if (state.secondsLeft <= 0) {
      clearInterval(ticker);
      ticker = null;
      onSessionComplete();
      return;
    }
    state.secondsLeft--;
    setTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  if (!state.running) return;
  state.running = false;
  clearInterval(ticker);
  ticker = null;
  updateStartStopBtn();
  releaseWakeLock();
}

function resetTimer() {
  pauseTimer();
  state.secondsLeft = state.mode === 'work' ? getWorkSecs() : getBreakSecs();
  setTimerDisplay();
  updateStartStopBtn();
}

function switchMode(mode) {
  pauseTimer();
  state.mode = mode;
  state.secondsLeft = mode === 'work' ? getWorkSecs() : getBreakSecs();

  document.getElementById('btn-work').classList.toggle('mode-active', mode === 'work');
  document.getElementById('btn-break').classList.toggle('mode-active', mode === 'break');

  // Update ring color
  const ring = document.getElementById('progress-ring');
  ring.style.stroke = mode === 'work' ? '#f59e0b' : '#34d399';

  document.getElementById('mode-label').textContent = mode === 'work' ? 'FOCUS SESSION' : 'BREAK TIME';
  setTimerDisplay();
  updateStartStopBtn();
}

function updateStartStopBtn() {
  const btn = document.getElementById('btn-startstop');
  btn.textContent = state.running ? '⏸ PAUSE' : '▶ START';
  btn.classList.toggle('btn-running', state.running);
}

function onSessionComplete() {
  state.running = false;
  releaseWakeLock();

  if (state.mode === 'work') {
    // Log session
    const today = todayKey();
    state.sessions[today] = (state.sessions[today] || 0) + 1;
    state.sessionsDone++;
    save();

    // Update active task progress
    if (state.activeTaskId) {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.pomodoros = (task.pomodoros || 0) + 1;
        save();
        renderTasks();
      }
    }

    renderHeatmap();
    renderStats();
    showCompletionPulse();
    sendNotification('🍅 Session complete!', 'Time for a break. Great work!');

    // Auto-switch to break
    setTimeout(() => switchMode('break'), 800);
  } else {
    sendNotification('⚡ Break over!', 'Ready to focus?');
    setTimeout(() => switchMode('work'), 800);
  }

  updateStartStopBtn();
}

function showCompletionPulse() {
  const el = document.getElementById('timer-container');
  el.classList.add('pulse-complete');
  setTimeout(() => el.classList.remove('pulse-complete'), 800);
}

// ─── Notifications ────────────────────────────────────────────
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'assets/icon.png' });
  }
  // Also play a subtle tone via Web Audio
  playChime(state.mode === 'break' ? 'work-done' : 'break-done');
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── Audio (Web Audio API — no CDN needed) ────────────────────
function playChime(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = type === 'work-done'
      ? [523, 659, 784, 1047]  // C5 E5 G5 C6 — bright ascending
      : [784, 659, 523];         // G5 E5 C5 — descending

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.35);
    });
  } catch (e) { /* audio not available */ }
}

// ─── Wake Lock ────────────────────────────────────────────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* not available */ }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// ─── Tasks ────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addTask(text) {
  if (!text.trim()) return;
  const task = {
    id: Date.now().toString(),
    text: text.trim(),
    done: false,
    pomodoros: 0,
    created: todayKey(),
  };
  state.tasks.unshift(task);
  save();
  renderTasks();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    if (state.activeTaskId === id && task.done) state.activeTaskId = null;
    save();
    renderTasks();
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (state.activeTaskId === id) state.activeTaskId = null;
  save();
  renderTasks();
}

function setActiveTask(id) {
  state.activeTaskId = state.activeTaskId === id ? null : id;
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const active = state.tasks.filter(t => !t.done);
  const done = state.tasks.filter(t => t.done);

  if (state.tasks.length === 0) {
    list.innerHTML = `<div class="task-empty">No tasks yet. Add one above ↑</div>`;
    return;
  }

  list.innerHTML = [...active, ...done].map(task => `
    <div class="task-item ${task.done ? 'task-done' : ''} ${state.activeTaskId === task.id ? 'task-active' : ''}"
         data-id="${task.id}">
      <button class="task-check" onclick="toggleTask('${task.id}')" title="Mark done">
        ${task.done ? '✓' : '○'}
      </button>
      <span class="task-text" onclick="setActiveTask('${task.id}')" title="Set as active">${escHtml(task.text)}</span>
      <span class="task-poms" title="${task.pomodoros} pomodoro${task.pomodoros !== 1 ? 's' : ''}">
        ${'🍅'.repeat(Math.min(task.pomodoros, 8))}${task.pomodoros > 8 ? `+${task.pomodoros - 8}` : ''}
      </span>
      <button class="task-del" onclick="deleteTask('${task.id}')" title="Delete">×</button>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Heatmap ──────────────────────────────────────────────────
function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  const days = 35; // 5 weeks
  const today = new Date();
  const cells = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = state.sessions[key] || 0;
    const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
    const isToday = i === 0;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    cells.push({ key, count, level, isToday, label });
  }

  grid.innerHTML = cells.map(c => `
    <div class="heat-cell level-${c.level} ${c.isToday ? 'today' : ''}"
         title="${c.label}: ${c.count} session${c.count !== 1 ? 's' : ''}">
    </div>
  `).join('');

  // Streak
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (state.sessions[key] && state.sessions[key] > 0) streak++;
    else break;
  }
  document.getElementById('streak-count').textContent = streak;
  const badge2 = document.getElementById('streak-count-2');
  if (badge2) badge2.textContent = streak;
}

function renderStats() {
  document.getElementById('sessions-today').textContent =
    state.sessions[todayKey()] || 0;
  document.getElementById('sessions-total').textContent =
    Object.values(state.sessions).reduce((a, b) => a + b, 0);
}

// ─── Settings ─────────────────────────────────────────────────
function openSettings() {
  document.getElementById('settings-modal').classList.remove('hidden');
  document.getElementById('input-work-mins').value = state.customWork;
  document.getElementById('input-break-mins').value = state.customBreak;
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
  const w = parseInt(document.getElementById('input-work-mins').value);
  const b = parseInt(document.getElementById('input-break-mins').value);
  if (w >= 1 && w <= 90) state.customWork = w;
  if (b >= 1 && b <= 30) state.customBreak = b;
  resetTimer();
  save();
  closeSettings();
}

// ─── Share ────────────────────────────────────────────────────
function shareApp() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-share');
    const orig = btn.textContent;
    btn.textContent = '✓ COPIED!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

// ─── Theme ────────────────────────────────────────────────────
function toggleTheme() {
  document.documentElement.classList.toggle('light');
  const isLight = document.documentElement.classList.contains('light');
  localStorage.setItem('ff_theme', isLight ? 'light' : 'dark');
  document.getElementById('btn-theme').textContent = isLight ? '☀' : '◐';
}

// ─── Init ─────────────────────────────────────────────────────
function init() {
  load();

  // Theme
  if (localStorage.getItem('ff_theme') === 'light') {
    document.documentElement.classList.add('light');
    document.getElementById('btn-theme').textContent = '☀';
  }

  setTimerDisplay();
  renderTasks();
  renderHeatmap();
  renderStats();

  // Timer duration display
  document.getElementById('duration-label').textContent =
    `${state.customWork}:00`;

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      state.running ? pauseTimer() : startTimer();
    }
    if (e.code === 'KeyR') resetTimer();
  });

  // Task input
  document.getElementById('task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      addTask(e.target.value);
      e.target.value = '';
    }
  });

  document.getElementById('btn-add-task').addEventListener('click', () => {
    const inp = document.getElementById('task-input');
    addTask(inp.value);
    inp.value = '';
    inp.focus();
  });

  // Auto-save every 30 seconds
  setInterval(save, 30000);
}

document.addEventListener('DOMContentLoaded', init);
