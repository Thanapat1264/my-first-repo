/*
 * นิสัยประจำวัน: หน้าจอ การเก็บข้อมูล และการโต้ตอบ
 * ตรรกะล้วน (วันที่ สตรีค สถิติ) อยู่ใน logic.js
 *
 * window.HabitApp เปิดไว้ไม่กี่ฟังก์ชันสำหรับต่อกับที่เก็บข้อมูลอื่นหรือใช้ทดสอบ:
 *   getState(), replaceState(raw), onChange(fn), toast(msg)
 */
(function () {
  'use strict';

  const L = window.HabitLogic;

  // ---------- ค่าคงที่ ----------

  const STORAGE_KEY = 'habit-tracker:v1';
  const VERSION = '1.1';

  const HUE_NAMES = {
    blue: 'น้ำเงิน', orange: 'ส้ม', aqua: 'เขียวมิ้นต์', yellow: 'เหลือง',
    magenta: 'ชมพู', green: 'เขียว', violet: 'ม่วง', red: 'แดง',
  };

  const EMOJIS = ['💧', '🏃', '🚶', '🏋️', '🧘', '🚴', '🏊', '🥗', '🍎', '😴', '🛌', '📚', '✍️', '🎯',
    '💊', '🦷', '🧹', '🧺', '🌞', '🎨', '🎸', '🧠', '💰', '📵', '🙏', '🌱', '☕', '🐕'];

  const IDEAS = [
    { name: 'ดื่มน้ำ', icon: '💧', color: 'blue', target: 8, unit: 'แก้ว' },
    { name: 'ออกกำลังกาย', icon: '🏃', color: 'orange', target: 1, unit: '' },
    { name: 'อ่านหนังสือ', icon: '📚', color: 'violet', target: 1, unit: '' },
    { name: 'เข้านอนก่อน 4 ทุ่ม', icon: '😴', color: 'magenta', target: 1, unit: '' },
    { name: 'นั่งสมาธิ', icon: '🧘', color: 'aqua', target: 1, unit: '' },
    { name: 'กินผักผลไม้', icon: '🥗', color: 'green', target: 1, unit: '' },
    { name: 'แปรงฟัน', icon: '🦷', color: 'yellow', target: 2, unit: 'ครั้ง' },
  ];

  const TABS = [
    { id: 'today', label: 'วันนี้', icon: 'today' },
    { id: 'stats', label: 'สถิติ', icon: 'stats' },
    { id: 'settings', label: 'ตั้งค่า', icon: 'settings' },
  ];

  const THEME_LABELS = { system: 'ตามระบบ', light: 'สว่าง', dark: 'มืด' };
  const THEME_COLORS = { light: '#eef3f0', dark: '#0b120f' };

  // ---------- เครื่องมือเล็ก ๆ ----------

  const $ = (sel, root) => (root || document).querySelector(sel);
  const todayKey = () => L.toKey(new Date());

  // เทมเพลต HTML ที่ escape ค่าที่แทรกให้อัตโนมัติ (ค่าจาก html`...` ซ้อนกันได้โดยไม่ถูก escape ซ้ำ)
  class Safe { constructor(s) { this.s = s; } }
  const raw = (s) => new Safe(String(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  function part(v) {
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    if (v === null || v === undefined || v === false) return '';
    return esc(v);
  }
  function html(strings, ...vals) {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
    return new Safe(out);
  }
  const mount = (el, safe) => { el.innerHTML = safe.s; };

  const PATHS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    today: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>',
    stats: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    calendar: '<path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18"/>',
  };
  function ico(name, size, filled) {
    const fill = filled ? 'currentColor' : 'none';
    return raw(`<svg class="ico" viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`);
  }

  function newId() {
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return 'h_' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
  }

  // ---------- สถานะและการเก็บข้อมูล ----------

  const ui = {
    tab: 'today',
    today: todayKey(),
    selected: null, // วันที่ที่กำลังดูในแท็บ "วันนี้"
    statDay: null,  // วันที่เลือกในกราฟแท่ง
    heatDay: null,  // วันที่เลือกใน heatmap
    detail: null,   // { id, y, m } ของชีตรายละเอียด
    form: null,     // สถานะฟอร์มเพิ่ม/แก้ไข
    pop: null,      // id ของนิสัยที่เพิ่งกด ใช้เล่นแอนิเมชันครั้งเดียว
    prevPct: 0,
    storageOk: true,
    installPrompt: null,
    celebrated: new Set(),   // เหรียญที่ฉลองไปแล้ววันนี้ ไม่ฉลองซ้ำเมื่อติ๊กออกแล้วติ๊กใหม่
    pendingCelebrate: null,  // เหรียญที่รอฉลองอยู่ เพราะตอนนั้นมีชีตเปิดบังอยู่
  };
  ui.selected = ui.today;
  ui.statDay = ui.today;

  const listeners = [];

  function load() {
    let text = null;
    try {
      text = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      ui.storageOk = false;
    }
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // ข้อมูลเสีย: เก็บสำเนาไว้ให้กู้คืนด้วยมือได้ แล้วเริ่มใหม่
        try { localStorage.setItem(STORAGE_KEY + ':corrupt', text); } catch (e2) { /* ไม่เป็นไร */ }
      }
    }
    return L.normalizeState(data, ui.today, newId);
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      ui.storageOk = true;
    } catch (e) {
      ui.storageOk = false;
    }
    for (const fn of listeners) {
      try { fn(state); } catch (e) { console.error(e); }
    }
  }

  function commit() {
    save();
    renderAll();
  }

  const findHabit = (id) => state.habits.find((h) => h.id === id);

  function setCount(id, key, n) {
    const h = findHabit(id);
    if (!h || key > ui.today) return;
    const before = L.countOn(h, key);
    const streakBefore = L.currentStreak(h, ui.today);
    n = Math.max(0, Math.min(99, n));
    if (n > 0) {
      h.log[key] = n;
      if (key < h.created) h.created = key; // ลงบันทึกย้อนหลังก่อนวันที่สร้าง = เริ่มนิสัยนี้ตั้งแต่วันนั้น
    } else {
      delete h.log[key];
    }
    let medalDays = null;
    if (n > before) {
      ui.pop = id;
      medalDays = L.crossedMilestone(streakBefore, L.currentStreak(h, ui.today));
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* ไม่รองรับ */ } }
    }
    commit();
    if (medalDays) celebrate(h, medalDays);
  }

  /** ตั้ง/ยกเลิกวันหยุดของนิสัยหนึ่งในวัน key (ไม่ commit ให้ผู้เรียกทำเอง) */
  function setRest(h, key, on) {
    if (key > ui.today) return;
    if (on) {
      h.log[key] = L.REST;
      if (key < h.created) h.created = key;
    } else if (L.isRest(h, key)) {
      delete h.log[key];
    }
  }

  function nextFreeHue() {
    const used = new Set(state.habits.map((h) => h.color));
    return L.HUES.find((c) => !used.has(c)) || L.HUES[state.habits.length % L.HUES.length];
  }

  // ---------- ธีม ----------

  let themeOwned = false; // เราเป็นคนตั้ง data-theme เอง: ถ้าไม่ใช่ (เช่นถูกฝังในหน้าที่ผู้ดูคุมธีมอยู่) จะไม่ไปลบของคนอื่น
  function applyTheme() {
    const pref = state.settings.theme;
    const root = document.documentElement;
    if (pref === 'light' || pref === 'dark') {
      root.dataset.theme = pref;
      themeOwned = true;
    } else if (themeOwned) {
      delete root.dataset.theme;
      themeOwned = false;
    }
    const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = dark ? THEME_COLORS.dark : THEME_COLORS.light; });
  }

  // ---------- วาดหน้าจอ ----------

  function renderAll() {
    const active = document.activeElement;
    const fk = active && active.dataset ? active.dataset.fk : null;

    renderChrome();
    if (ui.tab === 'today') renderToday();
    else if (ui.tab === 'stats') renderStats();
    else renderSettings();
    renderDetail();
    ui.pop = null; // แอนิเมชัน "ป๊อป" เล่นครั้งเดียวต่อการกด

    if (fk) {
      const next = Array.from(document.querySelectorAll('[data-fk]')).find((el) => el.dataset.fk === fk);
      if (next && next !== active) next.focus({ preventScroll: true });
    }
  }

  function renderChrome() {
    mount($('#tabbar'), html`${TABS.map((t) => html`<button class="tab" type="button" data-action="tab" data-tab="${t.id}" data-fk="tab:${t.id}"${ui.tab === t.id ? raw(' aria-current="page"') : ''}>${ico(t.icon)}<span>${t.label}</span></button>`)}`);
    for (const t of TABS) {
      const view = $('#view-' + t.id);
      view.hidden = ui.tab !== t.id;
      if (view.hidden) view.replaceChildren(); // ไม่เก็บ DOM เก่าของหน้าที่ซ่อนไว้
    }
    $('#fab').hidden = ui.tab !== 'today';
  }

  // --- แท็บ "วันนี้" ---

  function renderToday() {
    const { today, selected: sel } = ui;
    const habits = state.habits;
    const has = habits.length > 0;
    const list = habits.filter((h) => L.showsOn(h, sel));
    const sum = L.daySummary(habits, sel);
    const pct = sum.total ? Math.round((sum.done / sum.total) * 100) : 0;
    const allDone = sum.total > 0 && sum.done === sum.total;
    const week = L.lastDays(today, 7);
    const sums = week.map((k) => L.daySummary(habits, k));
    const isFull = (s) => s.total > 0 && s.done === s.total;

    const dayRested = habits.filter((h) => L.isScheduled(h, sel) && L.isRest(h, sel));
    const dayOpen = habits.filter((h) => L.isDue(h, sel) && L.countOn(h, sel) === 0); // ยังไม่ได้เริ่มเลย ตั้งวันหยุดได้
    const noneCap = dayRested.length ? 'วันหยุด' : 'ไม่มีนิสัยที่ต้องทำ';
    const hero = sum.total
      ? html`<div class="hero"><span class="hero-num">${sum.done}<span class="hero-of">/${sum.total}</span></span><span class="hero-cap">ทำแล้ว</span></div>`
      : html`<div class="hero"><span class="hero-num">–</span><span class="hero-cap">${noneCap}</span></div>`;

    const valueText = sum.total ? `ทำแล้ว ${sum.done} จาก ${sum.total}` : noneCap;
    const meter = html`<div class="meter" role="progressbar" aria-label="ความคืบหน้าของวัน" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${valueText}"><span style="width:${pct}%"></span></div>`;

    const strip = html`<div class="strip" role="group" aria-label="เลือกวัน (7 วันล่าสุด)">${week.map((key, i) => {
      const s = sums[i];
      const st = s.total === 0 ? 'none' : isFull(s) ? 'full' : s.done > 0 ? 'part' : 'zero';
      const link = isFull(s) && i < 6 && isFull(sums[i + 1]);
      const label = `${L.formatFull(key)} ${s.total ? `ทำแล้ว ${s.done} จาก ${s.total}` : 'ไม่มีนิสัยในตาราง'}`;
      return html`<button class="day${key === sel ? ' is-selected' : ''}${key === today ? ' is-today' : ''}${link ? ' link-r' : ''}" type="button" data-action="pick-day" data-date="${key}" data-fk="day:${key}" aria-pressed="${key === sel ? 'true' : 'false'}" aria-label="${label}"><span class="day-w">${L.TH_DAYS_SHORT[L.weekday(key)]}</span><span class="day-n">${L.parseKey(key).d}</span><span class="dot ${st}"></span></button>`;
    })}</div>`;

    let body;
    if (!has) body = emptyState();
    else if (!list.length) body = html`<p class="note">${sel === today ? 'วันนี้' : 'วันนั้น'}ไม่มีนิสัยที่ต้องทำ พักผ่อนได้เลย</p>`;
    else body = html`<ul class="habits">${list.map((h) => habitRow(h, sel))}</ul>`;

    // นิสัยที่มีอยู่แล้วในวันนั้นแต่ไม่ได้ตั้งให้ทำวันนั้น: แสดงเป็นชิปให้เห็นว่ายังอยู่ ไม่ได้หาย
    const resting = habits.filter((h) => sel >= h.created && !L.showsOn(h, sel));
    const restBlock = resting.length
      ? html`<section class="resting" aria-label="นิสัยที่ไม่ต้องทำ${sel === today ? 'วันนี้' : 'วันนั้น'}">
          <p class="resting-title">ไม่ต้องทำ${sel === today ? 'วันนี้' : 'วันนั้น'}</p>
          <div class="chips">${resting.map((h) => html`<button class="chip sm" type="button" data-action="open-habit" data-id="${h.id}" data-fk="rest:${h.id}">${h.icon} ${h.name}${L.isPaused(h, sel) ? html`<span class="tag">พักอยู่</span>` : ''}</button>`)}</div>
        </section>`
      : '';

    // วันนี้ไม่สะดวกทำ (ป่วย เดินทาง ฯลฯ): ตั้งทั้งวันเป็นวันหยุดในครั้งเดียว สตรีคไม่ขาด
    const which = sel === today ? 'วันนี้' : 'วันนั้น';
    const dayTools = has && (dayOpen.length || dayRested.length)
      ? html`<div class="day-tools">
          ${dayOpen.length ? html`<button class="link-btn" type="button" data-action="rest-day" data-fk="rest-day">${which}ไม่สะดวกทำ? ตั้งเป็นวันหยุด (สตรีคไม่ขาด)</button>` : ''}
          ${dayRested.length ? html`<button class="link-btn" type="button" data-action="unrest-day" data-fk="unrest-day">ยกเลิกวันหยุดของ${which}</button>` : ''}
        </div>`
      : '';

    const banner = allDone
      ? html`<p class="banner" role="status">${ico('check', 20)}<span>${sel === today ? 'ครบทุกนิสัยของวันนี้แล้ว เยี่ยมมาก' : 'วันนั้นทำครบทุกนิสัย'}</span></p>`
      : '';
    const warn = ui.storageOk ? '' : html`<p class="banner warn storage-warn" role="alert">บันทึกลงเครื่องนี้ไม่ได้ ข้อมูลจะหายเมื่อปิดหน้านี้ (ถ้าอยู่ในโหมดส่วนตัว ให้ลองปิดโหมดนั้น)</p>`;

    const el = $('#view-today');
    mount(el, html`
      <header class="today-head">
        <div class="head-row">
          <div class="head-title">
            <p class="eyebrow">${L.formatFull(sel)}</p>
            <h1 class="page-title" id="today-title">${L.relativeLabel(sel, today)}</h1>
          </div>
          ${has ? hero : ''}
        </div>
        ${has ? meter : ''}
        ${has ? strip : ''}
        ${has && sel !== today ? html`<div><button class="chip sm" type="button" data-action="go-today" data-fk="go-today">กลับมาที่วันนี้</button></div>` : ''}
      </header>
      ${banner}${warn}${body}${dayTools}${restBlock}`);

    const bar = $('.meter > span', el);
    if (bar && ui.prevPct !== pct) {
      bar.style.width = ui.prevPct + '%';
      void bar.offsetWidth; // บังคับให้เบราว์เซอร์วาดความกว้างเดิมก่อน แล้วค่อยเลื่อนไปค่าใหม่แบบมีแอนิเมชัน
      bar.style.width = pct + '%';
    }
    ui.prevPct = pct;
  }

  function habitRow(h, key) {
    if (L.isRest(h, key)) {
      const streakR = L.currentStreak(h, ui.today);
      return html`<li class="habit hue-${h.color} is-rest">
        <button class="habit-main" type="button" data-action="open-habit" data-id="${h.id}" data-fk="open:${h.id}">
          <span class="chip-icon" aria-hidden="true">${h.icon}</span>
          <span class="habit-text">
            <span class="habit-name">${h.name}</span>
            <span class="habit-meta"><span class="rest-tag">${ico('moon', 13)}วันหยุด</span>${streakR > 0 ? html`<span class="streak">${ico('flame', 14, true)}${streakR} วัน</span>` : ''}</span>
          </span>
        </button>
        <div class="habit-ctl"><button class="btn btn-ghost sm" type="button" data-action="unrest" data-id="${h.id}" data-fk="unrest:${h.id}" aria-label="ยกเลิกวันหยุดของ ${h.name}">ยกเลิก</button></div>
      </li>`;
    }
    const count = L.countOn(h, key);
    const done = count >= h.target;
    const multi = h.target > 1;
    const streak = L.currentStreak(h, ui.today);
    const unit = L.unitOf(h);
    const status = multi ? `${count}/${h.target} ${unit}` : done ? 'ทำแล้ว' : 'ยังไม่ได้ทำ';
    const pop = ui.pop === h.id ? ' pop' : '';

    const control = multi
      ? html`${count > 0 ? html`<button class="step" type="button" data-action="dec" data-id="${h.id}" data-fk="dec:${h.id}" aria-label="ลด ${h.name} หนึ่ง${unit}">${ico('minus', 20)}</button>` : ''}<button class="check is-count${done ? ' is-done' : ''}${pop}" type="button" style="--p:${Math.round((count / h.target) * 100)}" data-action="inc" data-id="${h.id}" data-fk="chk:${h.id}"${done ? raw(' aria-disabled="true"') : ''} aria-label="เพิ่ม ${h.name} (ตอนนี้ ${count} จาก ${h.target} ${unit})">${done ? ico('check', 26) : ico('plus', 24)}</button>`
      : html`<button class="check${done ? ' is-done' : ''}${pop}" type="button" data-action="toggle" data-id="${h.id}" data-fk="chk:${h.id}" aria-pressed="${done ? 'true' : 'false'}" aria-label="${h.name}">${ico('check', 26)}</button>`;

    return html`<li class="habit hue-${h.color}${done ? ' is-done' : ''}">
      <button class="habit-main" type="button" data-action="open-habit" data-id="${h.id}" data-fk="open:${h.id}">
        <span class="chip-icon" aria-hidden="true">${h.icon}</span>
        <span class="habit-text">
          <span class="habit-name">${h.name}</span>
          <span class="habit-meta"><span>${status}</span>${streak > 0 ? html`<span class="streak">${ico('flame', 14, true)}${streak} วัน</span>` : ''}${L.isScheduled(h, key) ? '' : html`<span>นอกตาราง</span>`}</span>
        </span>
      </button>
      <div class="habit-ctl">${control}</div>
    </li>`;
  }

  function emptyState() {
    return html`<section class="empty">
      <svg viewBox="0 0 200 56" width="200" height="56" aria-hidden="true" focusable="false">
        <g fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M44 28H84" stroke="var(--accent)"/>
          <path d="M116 28H156" stroke="var(--ring)" stroke-dasharray="2 7"/>
          <circle cx="28" cy="28" r="16" fill="var(--accent)" stroke="none"/>
          <path d="m21 28 5 5 9-10" stroke="var(--accent-ink)"/>
          <circle cx="100" cy="28" r="16" fill="var(--accent)" stroke="none"/>
          <path d="m93 28 5 5 9-10" stroke="var(--accent-ink)"/>
          <circle cx="172" cy="28" r="16" stroke="var(--ring)" stroke-dasharray="3 6"/>
        </g>
      </svg>
      <h2>เริ่มสร้างนิสัยแรกของคุณ</h2>
      <p>เลือกไอเดียด้านล่าง หรือตั้งเองก็ได้ ทำให้ต่อเนื่องหลายวันแล้วจะเห็นโซ่ของคุณยาวขึ้น</p>
      <div class="chips">${IDEAS.map((idea, i) => html`<button class="chip" type="button" data-action="idea-new" data-i="${i}">${idea.icon} ${idea.name}</button>`)}</div>
      <button class="btn btn-primary" type="button" data-action="new-habit">${ico('plus', 20)}เพิ่มนิสัยใหม่</button>
    </section>`;
  }

  // --- แท็บ "สถิติ" ---

  function renderStats() {
    const el = $('#view-stats');
    const habits = state.habits;
    if (!habits.length) {
      mount(el, html`<h1 class="page-title" id="stats-title">สถิติ</h1>
        <p class="note">ยังไม่มีข้อมูล เพิ่มนิสัยในแท็บ “วันนี้” แล้วสถิติจะแสดงที่นี่</p>`);
      return;
    }
    const { today } = ui;
    const week = L.lastDays(today, 7);
    const sums = week.map((k) => L.daySummary(habits, k));
    const s7 = L.overallStats(habits, week[0], today);
    const s30 = L.overallStats(habits, L.addDays(today, -29), today);
    const bestNow = Math.max(0, ...habits.map((h) => L.currentStreak(h, today)));

    // เทียบ 7 วันล่าสุดกับ 7 วันก่อนหน้า (แสดงผลอย่างเดียว ไม่บันทึกอะไร)
    const cmp = L.weekCompare(habits, today);
    const deltaView = (d) => (d === null
      ? html`<span class="delta same">ยังเทียบไม่ได้</span>`
      : d > 0 ? html`<span class="delta up">${ico('up', 16)}ดีขึ้น ${d} จุด</span>`
        : d < 0 ? html`<span class="delta down">${ico('down', 16)}ลดลง ${-d} จุด</span>`
          : html`<span class="delta same">${ico('minus', 16)}เท่าเดิม</span>`);
    const pctText = (v) => (v === null ? '–' : html`${v}<small>%</small>`);
    const cmpRows = cmp.rows.map((r) => {
      const h = habits.find((x) => x.id === r.id);
      return html`<li class="hue-${h.color}"><span class="chip-icon sm" aria-hidden="true">${h.icon}</span>
        <span class="cmp-name">${h.name}<span class="cmp-sub">${r.now === null ? '–' : r.now + '%'} · สัปดาห์ก่อน ${r.prev === null ? '–' : r.prev + '%'}</span></span>
        ${deltaView(r.delta)}</li>`;
    });
    const cmpCard = html`<section class="card" aria-labelledby="chart-cmp">
        <div><h2 class="card-title" id="chart-cmp">เทียบกับสัปดาห์ก่อน</h2><p class="card-sub">7 วันล่าสุด เทียบกับ 7 วันก่อนหน้านั้น</p></div>
        ${cmp.now === null && cmp.prev === null
          ? html`<p class="muted">ยังไม่มีข้อมูลพอให้เทียบ</p>`
          : html`<div class="cmp-hero">
              <div><span class="cmp-num">${pctText(cmp.now)}</span><span class="cmp-cap">7 วันล่าสุด</span></div>
              <div><span class="cmp-num dim">${pctText(cmp.prev)}</span><span class="cmp-cap">7 วันก่อนหน้า</span></div>
              ${deltaView(cmp.delta)}
            </div>
            <ul class="cmp-list">${cmpRows}</ul>`}
      </section>`;

    const kpi = (v, unit, label) => html`<div class="kpi"><div class="kpi-v">${v === null ? '–' : v}${v === null ? '' : html`<small>${unit}</small>`}</div><div class="kpi-l">${label}</div></div>`;

    // กราฟแท่ง 7 วัน
    const sel = week.indexOf(ui.statDay) !== -1 ? ui.statDay : today;
    const cols = week.map((key, i) => {
      const s = sums[i];
      const p = s.pct === null ? null : Math.round(s.pct * 100);
      const isSel = key === sel;
      const label = `${L.formatShort(key)}: ${p === null ? 'ไม่มีนิสัยในตาราง' : `${p}% (${s.done} จาก ${s.total})`}`;
      const bar = p === null ? '' : p === 0 ? html`<span class="col-bar stub"></span>` : html`<span class="col-bar" style="--v:${p}%"></span>`;
      const val = isSel && p !== null ? html`<span class="col-val" style="--v:${Math.max(p, 3)}%">${p}%</span>` : '';
      return html`<button class="col${isSel ? ' is-selected' : ''}" type="button" data-action="stat-pick" data-date="${key}" data-fk="col:${key}" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="${label}">${bar}${val}</button>`;
    });
    const selSum = sums[week.indexOf(sel)];
    const readout = selSum.total
      ? html`<strong>${L.formatShort(sel)}</strong> · ทำแล้ว ${selSum.done} จาก ${selSum.total} นิสัย (${Math.round(selSum.pct * 100)}%)`
      : html`<strong>${L.formatShort(sel)}</strong> · ไม่มีนิสัยในตาราง`;

    // heatmap 12 สัปดาห์
    const grid = L.heatmapGrid(today, 12);
    const months = [];
    grid.forEach((col, c) => {
      const first = col.find((k) => k && L.parseKey(k).d === 1);
      if (first) months.push({ c, text: L.TH_MONTHS_SHORT[L.parseKey(first).m - 1] });
    });
    if (!months.length || months[0].c >= 2) months.unshift({ c: 0, text: L.TH_MONTHS_SHORT[L.parseKey(grid[0][0]).m - 1] });

    const cells = [];
    grid.forEach((col, c) => col.forEach((key, r) => {
      if (!key) return;
      const s = L.daySummary(habits, key);
      const lv = s.total === 0 ? 'x' : s.done === 0 ? '0' : s.done / s.total < 0.5 ? '1' : s.done < s.total ? '2' : '3';
      const label = `${L.formatFull(key)} ${s.total ? `ทำแล้ว ${s.done} จาก ${s.total}` : 'ไม่มีนิสัยในตาราง'}`;
      cells.push(html`<button class="hc l${lv}${key === today ? ' is-today' : ''}${key === ui.heatDay ? ' is-selected' : ''}" type="button" style="grid-column:${c + 2};grid-row:${r + 2}" data-action="heat-pick" data-date="${key}" data-fk="hc:${key}" aria-label="${label}" title="${label}"></button>`);
    }));
    let heatReadout = html`แตะช่องเพื่อดูรายละเอียดของแต่ละวัน`;
    if (ui.heatDay) {
      const s = L.daySummary(habits, ui.heatDay);
      heatReadout = s.total
        ? html`<strong>${L.formatFull(ui.heatDay)}</strong> · ทำแล้ว ${s.done} จาก ${s.total} นิสัย`
        : html`<strong>${L.formatFull(ui.heatDay)}</strong> · ไม่มีนิสัยในตาราง`;
    }

    const rows = habits.map((h) => {
      const p30 = L.percent(L.rangeStats(h, L.addDays(today, -29), today));
      const cur = L.currentStreak(h, today);
      const best = L.bestStreak(h, today);
      const meterLabel = p30 === null ? 'ยังไม่มีข้อมูล' : `ทำสำเร็จ ${p30}% ใน 30 วันล่าสุด`;
      return html`<button class="stat-row hue-${h.color}" type="button" data-action="open-habit" data-id="${h.id}" data-fk="srow:${h.id}">
        <span class="chip-icon sm" aria-hidden="true">${h.icon}</span>
        <span class="stat-name">${h.name}${L.isPaused(h, today) ? html`<span class="tag">พักอยู่</span>` : ''}</span>
        <span class="stat-pct">${p30 === null ? '–' : p30}${p30 === null ? '' : html`<small>%</small>`}</span>
        <span class="meter meter-h" role="img" aria-label="${meterLabel}"><span style="width:${p30 || 0}%"></span></span>
        <span class="stat-sub">${ico('flame', 14, true)}<span>ต่อเนื่อง ${cur} วัน · สูงสุด ${best} วัน</span></span>
      </button>`;
    });

    mount(el, html`
      <h1 class="page-title" id="stats-title">สถิติ</h1>
      <div class="kpis">${kpi(L.percent(s7), '%', '7 วันล่าสุด')}${kpi(L.percent(s30), '%', '30 วันล่าสุด')}${kpi(bestNow, 'วัน', 'ต่อเนื่องนานสุดตอนนี้')}</div>

      ${cmpCard}

      <section class="card" aria-labelledby="chart-week">
        <div><h2 class="card-title" id="chart-week">ทำสำเร็จรายวัน</h2><p class="card-sub">สัดส่วนนิสัยที่ทำครบในแต่ละวัน 7 วันล่าสุด</p></div>
        <div class="plot">
          <span class="gl" style="bottom:0"><span>0%</span></span>
          <span class="gl" style="bottom:50%"><span>50%</span></span>
          <span class="gl" style="bottom:100%"><span>100%</span></span>
          <div class="bars">${cols}</div>
        </div>
        <div class="xlabels">${week.map((k) => html`<span class="${k === today ? 'is-today' : ''}">${L.TH_DAYS_SHORT[L.weekday(k)]}</span>`)}</div>
        <p class="readout" aria-live="polite">${readout}</p>
      </section>

      <section class="card" aria-labelledby="chart-heat">
        <div><h2 class="card-title" id="chart-heat">12 สัปดาห์ที่ผ่านมา</h2><p class="card-sub">ยิ่งเข้ม ยิ่งทำครบมากในวันนั้น</p></div>
        <div class="heat">
          ${months.map((m) => html`<span class="heat-m" style="grid-column:${m.c + 2}">${m.text}</span>`)}
          ${[1, 3, 5].map((r) => html`<span class="heat-w" style="grid-column:1;grid-row:${r + 2}">${L.TH_DAYS_SHORT[r]}</span>`)}
          ${cells}
        </div>
        <div class="legend" aria-hidden="true"><span>น้อย</span><i class="hc l0"></i><i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><span>มาก</span><span>·</span><i class="hc"></i><span>ไม่มีนิสัย</span></div>
        <p class="readout" aria-live="polite">${heatReadout}</p>
      </section>

      <section class="card" aria-labelledby="chart-habits">
        <div><h2 class="card-title" id="chart-habits">แต่ละนิสัย</h2><p class="card-sub">อัตราทำสำเร็จใน 30 วันล่าสุด และจำนวนวันต่อเนื่อง</p></div>
        <div class="rows">${rows}</div>
      </section>`);
  }

  // --- แท็บ "ตั้งค่า" ---

  function installCard() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) return '';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let body;
    if (ui.installPrompt) {
      body = html`<p class="muted">ติดตั้งเป็นแอปบนหน้าจอโฮม เปิดได้เร็วขึ้นและใช้งานออฟไลน์ได้</p><button class="btn btn-primary" type="button" data-action="install">ติดตั้งแอป</button>`;
    } else if (ios) {
      body = html`<p class="muted">บน iPhone/iPad ให้เปิดด้วย Safari แล้วแตะปุ่มแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) เลือก “เพิ่มไปยังหน้าจอโฮม” การติดตั้งช่วยให้ข้อมูลไม่ถูกล้างเมื่อไม่ได้เปิดใช้นาน ควรติดตั้งก่อนเริ่มบันทึก เพราะแอปที่ติดตั้งแยกที่เก็บข้อมูลจาก Safari ถ้ามีข้อมูลอยู่แล้วให้ส่งออกแล้วนำเข้าในแอปที่ติดตั้ง</p>`;
    } else {
      body = html`<p class="muted">บน Android (Chrome) แตะเมนู ⋮ แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”</p>`;
    }
    return html`<section class="card only-local"><h2 class="card-title">ติดตั้งลงมือถือ</h2>${body}</section>`;
  }

  function renderSettings() {
    const habits = state.habits;
    const remindCount = habits.filter((h) => h.remind).length;
    const order = habits.length > 1
      ? html`<section class="card" aria-labelledby="set-order"><h2 class="card-title" id="set-order">ลำดับนิสัย</h2>
          <ul class="order">${habits.map((h, i) => html`<li class="hue-${h.color}"><span class="chip-icon sm" aria-hidden="true">${h.icon}</span><span class="name">${h.name}</span>
            <button class="icon-btn" type="button" data-action="move-up" data-id="${h.id}" data-fk="up:${h.id}" aria-label="เลื่อน ${h.name} ขึ้น"${i === 0 ? raw(' disabled') : ''}>${ico('up', 20)}</button>
            <button class="icon-btn" type="button" data-action="move-down" data-id="${h.id}" data-fk="down:${h.id}" aria-label="เลื่อน ${h.name} ลง"${i === habits.length - 1 ? raw(' disabled') : ''}>${ico('down', 20)}</button></li>`)}</ul></section>`
      : '';

    mount($('#view-settings'), html`
      <h1 class="page-title" id="settings-title">ตั้งค่า</h1>

      <section class="card only-local" aria-labelledby="set-theme"><h2 class="card-title" id="set-theme">ธีม</h2>
        <div class="seg" role="group" aria-labelledby="set-theme">${L.THEMES.map((t) => html`<button type="button" data-action="set-theme" data-theme="${t}" data-fk="theme:${t}" aria-pressed="${state.settings.theme === t ? 'true' : 'false'}">${THEME_LABELS[t]}</button>`)}</div>
      </section>

      ${installCard()}
      ${order}

      <section class="card only-local" aria-labelledby="set-remind"><h2 class="card-title" id="set-remind">เตือนผ่านปฏิทิน</h2>
        <p class="muted">เว็บแอปส่งแจ้งเตือนเองตอนปิดแอปไม่ได้ จึงใช้ปฏิทินของมือถือเตือนแทน ตั้งเวลาเตือนในหน้าแก้ไขแต่ละนิสัย แล้วกดปุ่มด้านล่างเพื่อเพิ่มทุกนิสัยที่ตั้งเวลาไว้ลงปฏิทินในครั้งเดียว</p>
        <button class="btn" type="button" data-action="add-reminders-all"${remindCount ? '' : raw(' disabled')}>${ico('calendar', 20)}เพิ่มเตือนทั้งหมดลงปฏิทิน (${remindCount})</button>
        <p class="muted">เปลี่ยนเวลาทีหลัง? ลบเตือนเก่าในปฏิทินก่อน แล้วเพิ่มใหม่</p>
      </section>

      <section class="card" aria-labelledby="set-backup"><h2 class="card-title" id="set-backup">สำรองข้อมูล</h2>
        <p class="muted only-local">ข้อมูลเก็บอยู่ในเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ใด ส่งออกเป็นไฟล์ไว้เป็นระยะ เผื่อเปลี่ยนเครื่องหรือเผลอล้างข้อมูลเบราว์เซอร์</p>
        <p class="muted when-synced">ส่งออกข้อมูลเป็นไฟล์ไว้เก็บเอง หรือย้ายไปใช้กับแอปเวอร์ชันที่ติดตั้งบนมือถือ การนำเข้าจะแทนที่ข้อมูลปัจจุบันทั้งหมด</p>
        <div class="btn-row">
          <button class="btn" type="button" data-action="export">${ico('download', 20)}ส่งออก</button>
          <button class="btn" type="button" data-action="import">${ico('upload', 20)}นำเข้า</button>
        </div>
      </section>

      <section class="card only-synced" aria-labelledby="set-sync"><h2 class="card-title" id="set-sync">ข้อมูลของคุณ</h2>
        <p class="muted">นิสัยและบันทึกของคุณเก็บไว้กับบัญชีนี้ เปิดจากเครื่องไหนก็เห็นข้อมูลเดียวกัน คนอื่นเปิดดูไม่ได้
          <span class="sync-text" data-s="ok"> · ซิงก์เรียบร้อย</span><span class="sync-text" data-s="saving"> · กำลังบันทึก…</span><span class="sync-text" data-s="error"> · บันทึกไม่สำเร็จ จะลองใหม่อัตโนมัติ</span></p>
      </section>

      <section class="card" aria-labelledby="set-reset"><h2 class="card-title" id="set-reset">ล้างข้อมูล</h2>
        <p class="muted">ลบนิสัยและบันทึกทุกวันทั้งหมด กู้คืนไม่ได้</p>
        <button class="btn btn-danger" type="button" data-action="reset">${ico('trash', 20)}ล้างข้อมูลทั้งหมด</button>
      </section>

      <p class="about">นิสัยประจำวัน เวอร์ชัน ${VERSION}</p>`);
  }

  // --- ชีตรายละเอียดนิสัย ---

  function openDetail(id) {
    const h = findHabit(id);
    if (!h) return;
    const t = L.parseKey(ui.today);
    ui.detail = { id, y: t.y, m: t.m, mode: 'done' };
    openDialog($('#dlg-detail'));
    renderDetail();
  }

  function calCell(h, key) {
    if (!key) return html`<span></span>`;
    const count = L.countOn(h, key);
    const done = count >= h.target;
    const sched = L.isScheduled(h, key);
    const future = key > ui.today;
    let cls = '';
    let status;
    if (L.isRest(h, key)) { cls = ' is-rest'; status = 'วันหยุด'; }
    else if (done) { cls = ' is-done'; status = 'ทำแล้ว'; }
    else if (count > 0) { cls = ' is-part'; status = `ทำบางส่วน ${count} จาก ${h.target}`; }
    else if (sched && !future) { cls = ' is-miss'; status = 'ยังไม่ได้ทำ'; }
    else { cls = ' is-off'; status = sched ? 'ยังไม่ถึงวัน' : 'ไม่อยู่ในตาราง'; }
    if (key === ui.today) cls += ' is-today';
    return html`<button class="cal-d${cls}" type="button" data-action="cal-toggle" data-id="${h.id}" data-date="${key}" data-fk="cal:${key}"${future ? raw(' disabled') : ''} aria-label="${L.formatFull(key)} ${status}">${L.parseKey(key).d}</button>`;
  }

  function renderDetail() {
    const dlg = $('#dlg-detail');
    if (!dlg.open || !ui.detail) return;
    const h = findHabit(ui.detail.id);
    if (!h) { dlg.close(); return; }
    const { y, m } = ui.detail;
    const mode = ui.detail.mode || 'done';
    const { today } = ui;
    const t = L.parseKey(today);
    const lim = L.parseKey(L.addDays(today, -730));
    const isNow = y === t.y && m === t.m;
    const atMin = y < lim.y || (y === lim.y && m <= lim.m);
    const cur = L.currentStreak(h, today);
    const best = L.bestStreak(h, today);
    const p30 = L.percent(L.rangeStats(h, L.addDays(today, -29), today));
    const earned = L.earnedMilestones(h, today);
    const tile = (v, unit, label) => html`<div class="tile"><div class="tile-v">${v}${unit ? html`<small>${unit}</small>` : ''}</div><div class="tile-l">${label}</div></div>`;

    const pausedNow = L.isPaused(h, today);
    const open = (h.paused || []).find((p) => p.to === null);
    const pauseRow = pausedNow
      ? html`<div class="detail-row"><div><strong>พักนิสัยนี้อยู่</strong><span class="muted">${open ? `ตั้งแต่ ${L.formatDayMonth(open.from)} · ` : ''}ซ่อนจากรายการและไม่นับเป็นวันพลาด</span></div>
          <button class="btn sm" type="button" data-action="resume" data-id="${h.id}">${ico('play', 16)}กลับมาทำต่อ</button></div>`
      : html`<div class="detail-row"><div><strong>พักนิสัยนี้</strong><span class="muted">หยุดติดตามชั่วคราว ประวัติยังอยู่ กลับมาทำต่อได้ทุกเมื่อ</span></div>
          <button class="btn sm" type="button" data-action="pause" data-id="${h.id}">${ico('pause', 16)}พัก</button></div>`;
    const remindRow = h.remind
      ? html`<div class="detail-row only-local"><div><strong>เตือนเวลา ${h.remind} น.</strong><span class="muted">ผ่านปฏิทินมือถือ</span></div>
          <button class="btn sm" type="button" data-action="add-reminder" data-id="${h.id}">${ico('calendar', 16)}เพิ่มลงปฏิทิน</button></div>`
      : '';

    mount($('.sheet', dlg), html`
      <div class="sheet-grab" aria-hidden="true"></div>
      <div class="hue-${h.color}">
        <div class="detail-head">
          <span class="chip-icon" aria-hidden="true">${h.icon}</span>
          <div class="detail-title"><h2 id="detail-title">${h.name}</h2><p>${L.describeDays(h.days)} · ${L.describeGoal(h)}</p></div>
          <button class="icon-btn" type="button" data-action="edit-habit" data-id="${h.id}" aria-label="แก้ไข ${h.name}">${ico('edit', 20)}</button>
          <button class="icon-btn" type="button" data-action="close-dialog" aria-label="ปิด">${ico('x', 20)}</button>
        </div>
        <div class="tiles">
          ${tile(cur, 'วัน', 'ต่อเนื่องตอนนี้')}
          ${tile(best, 'วัน', 'ต่อเนื่องสูงสุด')}
          ${tile(L.totalDone(h), 'วัน', 'ทำสำเร็จทั้งหมด')}
          ${tile(p30 === null ? '–' : p30, p30 === null ? '' : '%', 'อัตราใน 30 วัน')}
        </div>
        <div class="medals" role="group" aria-label="เหรียญสตรีค">
          ${L.MILESTONES.map((d) => html`<div class="medal-slot${earned.indexOf(d) !== -1 ? ' earned' : ''}">${medal(d, 44)}<span>${d} วัน${earned.indexOf(d) !== -1 ? ' · ได้แล้ว' : ''}</span></div>`)}
        </div>
        <div class="cal-head">
          <button class="icon-btn" type="button" data-action="cal-prev" data-fk="cal-prev" aria-label="เดือนก่อนหน้า"${atMin ? raw(' disabled') : ''}>${ico('left', 20)}</button>
          <h3>${L.formatMonthYear(y, m)}</h3>
          <button class="icon-btn" type="button" data-action="cal-next" data-fk="cal-next" aria-label="เดือนถัดไป"${isNow ? raw(' disabled') : ''}>${ico('right', 20)}</button>
        </div>
        <div class="cal">
          ${L.TH_DAYS_SHORT.map((d) => html`<span class="cal-h">${d}</span>`)}
          ${L.monthGrid(y, m).flat().map((key) => calCell(h, key))}
        </div>
        <div class="cal-mode" role="group" aria-label="แตะวันที่เพื่อ">
          <span class="muted">แตะวันที่เพื่อ</span>
          <div class="seg seg-2">
            <button type="button" data-action="cal-mode" data-mode="done" data-fk="mode:done" aria-pressed="${mode === 'done' ? 'true' : 'false'}">ทำแล้ว</button>
            <button type="button" data-action="cal-mode" data-mode="rest" data-fk="mode:rest" aria-pressed="${mode === 'rest' ? 'true' : 'false'}">วันหยุด</button>
          </div>
        </div>
        <p class="cal-hint">${mode === 'rest'
          ? 'แตะวันที่เพื่อสลับ “วันหยุด” (เช่น ป่วย เดินทาง) วันหยุดไม่ทำให้สตรีคขาดและไม่นับเป็นวันพลาด'
          : html`แตะวันที่เพื่อสลับ “ทำแล้ว / ยังไม่ทำ”${h.target > 1 ? ` (บันทึกครบ ${h.target} ${L.unitOf(h)})` : ''}`}</p>
        ${remindRow}
        ${pauseRow}
      </div>`);
  }

  // --- ฟอร์มเพิ่ม/แก้ไขนิสัย ---

  function openForm(id, preset) {
    const h = id ? findHabit(id) : null;
    const base = h || preset || {};
    ui.form = {
      id: h ? h.id : null,
      name: base.name || '',
      icon: base.icon || '🎯',
      color: base.color || nextFreeHue(),
      days: new Set(h ? h.days : [0, 1, 2, 3, 4, 5, 6]),
      target: base.target || 1,
      unit: base.unit || '',
      remind: base.remind || '',
    };
    renderForm();
    openDialog($('#dlg-form'));
    if (!h && window.matchMedia('(pointer: fine)').matches) {
      const input = $('#f-name');
      if (input) input.focus();
    }
  }

  function renderForm() {
    const f = ui.form;
    const editing = !!f.id;
    const icons = EMOJIS.indexOf(f.icon) === -1 ? [f.icon].concat(EMOJIS) : EMOJIS;
    const dayChip = (d) => html`<button type="button" data-action="toggle-dow" data-d="${d}" aria-pressed="${f.days.has(d) ? 'true' : 'false'}" aria-label="วัน${L.TH_DAYS[d]}">${L.TH_DAYS_SHORT[d]}</button>`;

    mount($('#dlg-form .sheet'), html`
      <div class="sheet-grab" aria-hidden="true"></div>
      <div class="sheet-head"><h2 id="form-title">${editing ? 'แก้ไขนิสัย' : 'เพิ่มนิสัยใหม่'}</h2>
        <button class="icon-btn" type="button" data-action="close-dialog" aria-label="ปิด">${ico('x', 20)}</button></div>
      <form class="form" id="habit-form" novalidate>
        <div class="field">
          <label class="label" for="f-name">ชื่อนิสัย</label>
          <input class="input" id="f-name" name="name" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="เช่น ดื่มน้ำ อ่านหนังสือ" value="${f.name}">
          <p class="field-error" id="f-name-err" role="alert" hidden>กรุณาตั้งชื่อนิสัย</p>
        </div>
        ${editing ? '' : html`<div class="field"><span class="label">หรือเลือกจากไอเดีย</span>
          <div class="chips">${IDEAS.map((idea, i) => html`<button class="chip sm" type="button" data-action="idea" data-i="${i}">${idea.icon} ${idea.name}</button>`)}</div></div>`}
        <div class="field"><span class="label" id="lbl-icon">ไอคอน</span>
          <div class="emoji-grid" role="group" aria-labelledby="lbl-icon">${icons.map((e) => html`<button class="emoji" type="button" data-action="pick-icon" data-icon="${e}" aria-pressed="${f.icon === e ? 'true' : 'false'}" aria-label="ไอคอน ${e}">${e}</button>`)}</div></div>
        <div class="field"><span class="label" id="lbl-color">สี</span>
          <div class="swatches" role="group" aria-labelledby="lbl-color">${L.HUES.map((c) => html`<button class="swatch hue-${c}" type="button" data-action="pick-color" data-color="${c}" aria-pressed="${f.color === c ? 'true' : 'false'}" aria-label="สี${HUE_NAMES[c]}">${ico('check', 18)}</button>`)}</div></div>
        <div class="field"><span class="label" id="lbl-days">ทำวันไหนบ้าง</span>
          <div class="dow" role="group" aria-labelledby="lbl-days">${[0, 1, 2, 3, 4, 5, 6].map(dayChip)}</div>
          <div class="chips">
            <button class="chip sm" type="button" data-action="dow-preset" data-p="all">ทุกวัน</button>
            <button class="chip sm" type="button" data-action="dow-preset" data-p="weekdays">จันทร์–ศุกร์</button>
            <button class="chip sm" type="button" data-action="dow-preset" data-p="weekend">เสาร์–อาทิตย์</button>
          </div></div>
        <div class="field"><span class="label" id="lbl-target">เป้าหมายต่อวัน (ครั้ง)</span>
          <div class="stepper" role="group" aria-labelledby="lbl-target">
            <button class="icon-btn" type="button" data-action="target-dec" aria-label="ลดเป้าหมาย">${ico('minus', 20)}</button>
            <output id="f-target" aria-live="polite">${f.target}</output>
            <button class="icon-btn" type="button" data-action="target-inc" aria-label="เพิ่มเป้าหมาย">${ico('plus', 20)}</button>
          </div>
          <div class="field" id="f-unit-wrap"${f.target > 1 ? '' : raw(' hidden')}>
            <label class="label" for="f-unit">หน่วย</label>
            <input class="input" id="f-unit" name="unit" maxlength="12" autocomplete="off" placeholder="เช่น แก้ว หน้า นาที" value="${f.unit}">
          </div></div>
        <div class="field only-local"><label class="label" for="f-remind">เตือนผ่านปฏิทินมือถือ (ไม่บังคับ)</label>
          <div class="remind-input">
            <input class="input" id="f-remind" name="remind" type="time" value="${f.remind}">
            <button class="btn sm" type="button" data-action="clear-remind">ล้าง</button>
          </div>
          <p class="muted">ตั้งเวลาแล้วบันทึก จากนั้นเปิดหน้ารายละเอียดของนิสัยแล้วกด “เพิ่มลงปฏิทิน”</p></div>
        <div class="sheet-actions">
          ${editing ? html`<button class="btn btn-danger btn-icon-danger" type="button" data-action="delete-habit" aria-label="ลบนิสัยนี้">${ico('trash', 20)}</button>` : ''}
          <button class="btn btn-primary" type="submit">บันทึก</button>
        </div>
      </form>`);
  }

  const syncPressed = (selector, test) => {
    document.querySelectorAll(selector).forEach((b) => b.setAttribute('aria-pressed', test(b) ? 'true' : 'false'));
  };

  function saveForm() {
    const f = ui.form;
    const name = f.name.trim();
    if (!name) {
      $('#f-name-err').hidden = false;
      $('#f-name').focus();
      return;
    }
    const fields = { name, icon: f.icon, color: f.color, days: Array.from(f.days), target: f.target, unit: f.unit, remind: f.remind };
    if (f.id) {
      const i = state.habits.findIndex((h) => h.id === f.id);
      if (i === -1) {
        closeDialog($('#dlg-form'));
        toast('ไม่พบนิสัยนี้แล้ว อาจถูกลบจากหน้าต่างอื่น');
        return;
      }
      const next = L.normalizeHabit(Object.assign({}, state.habits[i], fields), ui.today);
      next.id = f.id;
      state.habits[i] = next;
    } else {
      if (state.habits.length >= L.MAX_HABITS) { toast(`เพิ่มได้สูงสุด ${L.MAX_HABITS} นิสัย`); return; }
      state.habits.push(L.normalizeHabit(Object.assign({ id: newId(), created: ui.today, log: {} }, fields), ui.today));
    }
    const wasEditing = !!f.id;
    closeDialog($('#dlg-form'));
    commit();
    toast(wasEditing ? 'บันทึกการแก้ไขแล้ว' : `เพิ่ม “${name}” แล้ว`);
  }

  // ---------- เหรียญและการฉลอง ----------

  /** เหรียญสตรีคแบบ SVG (สีเหรียญกำหนดใน CSS ตามจำนวนวัน) */
  function medal(days, size) {
    const w = size || 56;
    const big = days >= 100;
    return raw(`<svg class="medal m${days}" viewBox="0 0 64 72" width="${w}" height="${Math.round((w * 72) / 64)}" aria-hidden="true" focusable="false"><path class="ribbon" d="M18 2h12l6 22H24z"/><path class="ribbon" d="M46 2H34l-6 22h12z"/><circle class="disc" cx="32" cy="46" r="22"/><circle class="ring" cx="32" cy="46" r="17"/><text x="32" y="${big ? 51 : 52.5}" text-anchor="middle" font-size="${big ? 14 : 19}" font-weight="700">${days}</text></svg>`);
  }

  const CONFETTI = ['var(--blue)', 'var(--orange)', 'var(--aqua)', 'var(--yellow)', 'var(--magenta)', 'var(--green)', 'var(--violet)', 'var(--red)'];
  function confettiPieces() {
    const out = [];
    for (let i = 0; i < 28; i++) {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.5).toFixed(2);
      const dur = (1.6 + Math.random() * 1.2).toFixed(2);
      const rot = Math.round(Math.random() * 360);
      const sway = Math.round(Math.random() * 80 - 40);
      out.push(html`<i style="--l:${left}%;--d:${delay}s;--t:${dur}s;--r:${rot}deg;--s:${sway}px;--c:${CONFETTI[i % CONFETTI.length]}"></i>`);
    }
    return out;
  }

  /** ประกาศให้โปรแกรมอ่านหน้าจอ (ข้อความในพื้นที่ซ่อนที่เป็น live region) */
  function announce(msg) {
    const el = $('#live');
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 50);
  }

  let celebrateTimer = null;
  function hideCelebrate() {
    clearTimeout(celebrateTimer);
    const el = $('#celebrate');
    el.hidden = true;
    el.replaceChildren();
  }
  function celebrate(h, days) {
    if (document.querySelector('dialog[open]')) { ui.pendingCelebrate = { id: h.id, days }; return; } // ชีตเปิดบังอยู่ รอปิดก่อน
    const key = `${h.id}:${days}:${ui.today}`;
    if (ui.celebrated.has(key)) return;
    ui.celebrated.add(key);
    const el = $('#celebrate');
    mount(el, html`<div class="confetti" aria-hidden="true">${confettiPieces()}</div>
      <div class="celebrate-card hue-${h.color}">${medal(days, 96)}
        <h2>ต่อเนื่อง ${days} วันแล้ว!</h2>
        <p><span aria-hidden="true">${h.icon}</span> ${h.name}</p>
        <p class="muted">แตะเพื่อปิด</p></div>`);
    el.hidden = false;
    announce(`ได้เหรียญต่อเนื่อง ${days} วัน ${h.name}`);
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(hideCelebrate, 4200);
  }

  // ---------- กล่องโต้ตอบ ----------

  function openDialog(dlg) {
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
      } else { // เบราว์เซอร์เก่าที่ไม่มี <dialog> แบบ modal: เปิดด้วย attribute แล้วให้ CSS ทำฉากหลังแทน
        dlg.setAttribute('open', '');
        document.documentElement.classList.add('no-modal');
      }
    }
    document.body.classList.add('modal-open');
  }
  function closeDialog(dlg) {
    if (!dlg.open) return;
    if (typeof dlg.close === 'function') {
      dlg.close();
    } else {
      dlg.removeAttribute('open');
      dlg.dispatchEvent(new Event('close'));
    }
  }

  let confirmResolve = null;
  function askConfirm(opts) {
    return new Promise((resolve) => {
      const dlg = $('#dlg-confirm');
      if (confirmResolve) confirmResolve(false);
      confirmResolve = resolve;
      mount($('.sheet', dlg), html`
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-head"><h2 id="confirm-title">${opts.title}</h2></div>
        <p class="confirm-text">${opts.text}</p>
        <div class="btn-row">
          <button class="btn" type="button" data-action="confirm-no">ยกเลิก</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" type="button" data-action="confirm-yes">${opts.yes}</button>
        </div>`);
      openDialog(dlg);
    });
  }
  function settleConfirm(value) {
    const r = confirmResolve;
    confirmResolve = null;
    if (r) r(value);
    closeDialog($('#dlg-confirm'));
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ---------- สำรอง / นำเข้า / ล้างข้อมูล ----------

  /** ส่งไฟล์ออกจากแอป: ใช้แผ่นแชร์ของมือถือถ้าได้ ไม่งั้นดาวน์โหลดตรง คืน false ถ้าผู้ใช้ยกเลิก */
  async function deliverFile(name, text, mime, shareTitle, doneMsg) {
    try {
      const file = new File([text], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
        return true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast(doneMsg);
    return true;
  }

  function exportData() {
    const text = JSON.stringify({
      app: 'habit-tracker', version: 1, exportedAt: new Date().toISOString(),
      habits: state.habits, settings: state.settings,
    }, null, 2);
    return deliverFile(`habit-tracker-${ui.today}.json`, text, 'application/json', 'ข้อมูลนิสัยประจำวัน', 'บันทึกไฟล์สำรองแล้ว');
  }

  /** สร้างไฟล์เตือนซ้ำสำหรับปฏิทินมือถือ ของนิสัยที่ตั้งเวลา remind ไว้ */
  function addReminders(list) {
    const withTime = list.filter((h) => h.remind);
    if (!withTime.length) { toast('ยังไม่ได้ตั้งเวลาเตือน'); return Promise.resolve(false); }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const url = location.href.split('#')[0].split('?')[0];
    const text = L.buildIcs(withTime, ui.today, stamp, /^https?:/.test(url) ? url : '');
    return deliverFile(withTime.length === 1 ? 'habit-reminder.ics' : 'habit-reminders.ics', text, 'text/calendar',
      'เตือนนิสัยประจำวัน', 'ได้ไฟล์เตือนแล้ว เปิดไฟล์นั้นเพื่อเพิ่มลงปฏิทิน');
  }

  async function importFile(file) {
    let next;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.habits)) throw new Error('รูปแบบไม่ถูกต้อง');
      next = L.normalizeState(data, ui.today, newId);
      if (!next.habits.length) throw new Error('ไม่มีนิสัยในไฟล์');
    } catch (e) {
      toast('อ่านไฟล์ไม่ได้ ตรวจสอบว่าเป็นไฟล์สำรองจากแอปนี้');
      return;
    }
    const days = next.habits.reduce((n, h) => n + Object.keys(h.log).length, 0);
    const ok = await askConfirm({
      title: 'นำเข้าข้อมูลนี้?',
      text: `พบ ${next.habits.length} นิสัย และบันทึก ${days} รายการ ข้อมูลปัจจุบันบนเครื่องนี้จะถูกแทนที่ทั้งหมด`,
      yes: 'แทนที่ด้วยไฟล์นี้',
      danger: true,
    });
    if (!ok) return;
    state = next;
    applyTheme();
    commit();
    toast('นำเข้าข้อมูลแล้ว');
  }

  async function resetAll() {
    const ok = await askConfirm({
      title: 'ล้างข้อมูลทั้งหมด?',
      text: 'นิสัยและบันทึกทุกวันจะถูกลบถาวร กู้คืนไม่ได้ ถ้าอยากเก็บไว้ ให้ส่งออกไฟล์สำรองก่อน',
      yes: 'ลบทั้งหมด',
      danger: true,
    });
    if (!ok) return;
    state = L.normalizeState(null, ui.today, newId);
    applyTheme();
    commit();
    toast('ล้างข้อมูลแล้ว');
  }

  // ---------- ตัวจัดการการกด ----------

  const DOW_PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], weekdays: [1, 2, 3, 4, 5], weekend: [0, 6] };

  const actions = {
    tab(t) {
      ui.tab = t.dataset.tab;
      window.scrollTo(0, 0);
      renderAll();
    },
    'new-habit': () => openForm(null),
    'idea-new': (t) => openForm(null, IDEAS[+t.dataset.i]),
    idea(t) {
      const idea = IDEAS[+t.dataset.i];
      Object.assign(ui.form, { name: idea.name, icon: idea.icon, color: idea.color, target: idea.target, unit: idea.unit });
      renderForm();
    },
    'open-habit': (t) => openDetail(t.dataset.id),
    'go-today'() { ui.selected = ui.today; renderAll(); },
    'pick-day'(t) { ui.selected = t.dataset.date; renderAll(); },

    toggle(t) {
      const h = findHabit(t.dataset.id);
      if (h) setCount(h.id, ui.selected, L.isDone(h, ui.selected) ? 0 : h.target);
    },
    inc(t) {
      const h = findHabit(t.dataset.id);
      if (h && L.countOn(h, ui.selected) < h.target) setCount(h.id, ui.selected, L.countOn(h, ui.selected) + 1);
    },
    dec(t) {
      const h = findHabit(t.dataset.id);
      if (h) setCount(h.id, ui.selected, L.countOn(h, ui.selected) - 1);
    },

    'close-dialog': (t) => closeDialog(t.closest('dialog')),
    'edit-habit': (t) => openForm(t.dataset.id),
    'cal-prev'() {
      const d = ui.detail;
      d.m -= 1;
      if (d.m < 1) { d.m = 12; d.y -= 1; }
      renderDetail();
    },
    'cal-next'() {
      const d = ui.detail;
      d.m += 1;
      if (d.m > 12) { d.m = 1; d.y += 1; }
      renderDetail();
    },
    'cal-toggle'(t) {
      const h = findHabit(t.dataset.id);
      if (!h) return;
      if (ui.detail && ui.detail.mode === 'rest') {
        setRest(h, t.dataset.date, !L.isRest(h, t.dataset.date));
        commit();
      } else {
        setCount(h.id, t.dataset.date, L.isDone(h, t.dataset.date) ? 0 : h.target);
      }
    },
    'cal-mode'(t) { ui.detail.mode = t.dataset.mode; renderDetail(); },

    unrest(t) {
      const h = findHabit(t.dataset.id);
      if (h) { setRest(h, ui.selected, false); commit(); }
    },
    'rest-day'() {
      const sel = ui.selected;
      let n = 0;
      for (const h of state.habits) if (L.isDue(h, sel) && L.countOn(h, sel) === 0) { setRest(h, sel, true); n++; }
      if (n) { commit(); toast(`ตั้ง${sel === ui.today ? 'วันนี้' : 'วันนั้น'}เป็นวันหยุดแล้ว สตรีคไม่ขาด`); }
    },
    'unrest-day'() {
      const sel = ui.selected;
      for (const h of state.habits) if (L.isScheduled(h, sel)) setRest(h, sel, false);
      commit();
    },
    pause(t) {
      const h = findHabit(t.dataset.id);
      if (!h) return;
      L.pauseHabit(h, ui.today);
      commit();
      toast(`พัก “${h.name}” แล้ว กลับมาทำต่อได้ที่นี่`);
    },
    resume(t) {
      const h = findHabit(t.dataset.id);
      if (!h) return;
      L.resumeHabit(h, ui.today);
      commit();
      toast(`กลับมาทำ “${h.name}” ต่อแล้ว`);
    },
    'add-reminder'(t) { const h = findHabit(t.dataset.id); if (h) addReminders([h]); },
    'add-reminders-all'() { addReminders(state.habits); },
    'clear-remind'() {
      ui.form.remind = '';
      const input = $('#f-remind');
      if (input) input.value = '';
    },
    'close-celebrate': hideCelebrate,

    'pick-icon'(t) {
      ui.form.icon = t.dataset.icon;
      syncPressed('#dlg-form .emoji', (b) => b.dataset.icon === ui.form.icon);
    },
    'pick-color'(t) {
      ui.form.color = t.dataset.color;
      syncPressed('#dlg-form .swatch', (b) => b.dataset.color === ui.form.color);
    },
    'toggle-dow'(t) {
      const d = +t.dataset.d;
      const days = ui.form.days;
      if (days.has(d)) { if (days.size > 1) days.delete(d); } else days.add(d);
      syncPressed('#dlg-form .dow button', (b) => days.has(+b.dataset.d));
    },
    'dow-preset'(t) {
      ui.form.days = new Set(DOW_PRESETS[t.dataset.p]);
      syncPressed('#dlg-form .dow button', (b) => ui.form.days.has(+b.dataset.d));
    },
    'target-dec': () => setTarget(ui.form.target - 1),
    'target-inc': () => setTarget(ui.form.target + 1),
    async 'delete-habit'() {
      const h = findHabit(ui.form.id);
      if (!h) return;
      const ok = await askConfirm({
        title: `ลบ “${h.name}”?`,
        text: 'ประวัติทั้งหมดของนิสัยนี้จะถูกลบถาวร กู้คืนไม่ได้',
        yes: 'ลบนิสัยนี้',
        danger: true,
      });
      if (!ok) return;
      state.habits = state.habits.filter((x) => x.id !== h.id);
      ui.detail = null;
      closeDialog($('#dlg-form'));
      closeDialog($('#dlg-detail'));
      commit();
      toast('ลบนิสัยแล้ว');
    },

    'stat-pick'(t) { ui.statDay = t.dataset.date; renderAll(); },
    'heat-pick'(t) { ui.heatDay = ui.heatDay === t.dataset.date ? null : t.dataset.date; renderAll(); },

    'set-theme'(t) {
      state.settings.theme = t.dataset.theme;
      applyTheme();
      commit();
    },
    'move-up': (t) => moveHabit(t.dataset.id, -1),
    'move-down': (t) => moveHabit(t.dataset.id, 1),
    export: exportData,
    import() { const input = $('#import-file'); input.value = ''; input.click(); },
    reset: resetAll,
    async install() {
      const p = ui.installPrompt;
      if (!p) return;
      ui.installPrompt = null;
      p.prompt();
      try { await p.userChoice; } catch (e) { /* ไม่เป็นไร */ }
      renderAll();
    },
    'confirm-yes': () => settleConfirm(true),
    'confirm-no': () => settleConfirm(false),
  };

  function setTarget(n) {
    ui.form.target = Math.max(1, Math.min(99, n));
    $('#f-target').textContent = ui.form.target;
    $('#f-unit-wrap').hidden = ui.form.target <= 1;
  }

  function moveHabit(id, delta) {
    const i = state.habits.findIndex((h) => h.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= state.habits.length) return;
    const tmp = state.habits[i];
    state.habits[i] = state.habits[j];
    state.habits[j] = tmp;
    commit();
  }

  function onClick(e) {
    const t = e.target.closest('[data-action]');
    if (t) {
      const fn = actions[t.dataset.action];
      if (fn) fn(t, e);
      return;
    }
    // แตะพื้นหลังมืดนอกชีต = ปิดกล่องโต้ตอบ
    if (e.target.tagName === 'DIALOG') closeDialog(e.target);
  }

  function onInput(e) {
    if (!ui.form) return;
    if (e.target.id === 'f-name') {
      ui.form.name = e.target.value;
      if (e.target.value.trim()) $('#f-name-err').hidden = true;
    } else if (e.target.id === 'f-unit') {
      ui.form.unit = e.target.value;
    } else if (e.target.id === 'f-remind') {
      ui.form.remind = e.target.value;
    }
  }

  function onSubmit(e) {
    if (e.target.id === 'habit-form') {
      e.preventDefault();
      saveForm();
    }
  }

  // ---------- เริ่มทำงาน ----------

  function checkDay() {
    const t = todayKey();
    if (t === ui.today) return;
    const follow = ui.selected === ui.today;
    ui.today = t;
    if (follow || ui.selected < L.addDays(t, -6)) ui.selected = t;
    ui.statDay = t;
    renderAll();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (location.protocol !== 'https:' && !local) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* ไม่มีออฟไลน์ แต่แอปยังใช้ได้ */ });
  }

  function init() {
    applyTheme();
    mount($('#fab'), ico('plus', 28));

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('submit', onSubmit);
    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importFile(file);
    });

    document.querySelectorAll('dialog').forEach((dlg) => {
      dlg.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
        if (dlg.id === 'dlg-detail') ui.detail = null;
        if (dlg.id === 'dlg-form') ui.form = null;
        if (dlg.id === 'dlg-confirm' && confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); }
        if (ui.pendingCelebrate && !document.querySelector('dialog[open]')) {
          const { id, days } = ui.pendingCelebrate;
          ui.pendingCelebrate = null;
          const h = findHabit(id);
          if (h) celebrate(h, days);
        }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#celebrate').hidden) hideCelebrate();
    });

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (scheme.addEventListener) scheme.addEventListener('change', applyTheme);

    // หน้าต่าง/แท็บอื่นของแอปนี้บันทึกข้อมูล: โหลดตามเพื่อไม่เขียนทับกัน
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || e.storageArea !== window.localStorage) return;
      state = load();
      applyTheme();
      renderAll();
    });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
    setInterval(checkDay, 30000);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      ui.installPrompt = e;
      if (ui.tab === 'settings') renderAll();
    });
    window.addEventListener('appinstalled', () => {
      ui.installPrompt = null;
      if (ui.tab === 'settings') renderAll();
    });

    renderAll();
    registerServiceWorker();
  }

  window.HabitApp = {
    getState: () => state,
    replaceState(next) {
      state = L.normalizeState(next, ui.today, newId);
      applyTheme();
      save();
      renderAll();
    },
    onChange(fn) { listeners.push(fn); },
    toast,
  };

  init();
})();
