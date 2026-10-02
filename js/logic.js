/*
 * ตรรกะหลักของแอปติดตามนิสัย: วันที่, ตารางวัน, สตรีค และสถิติ
 * ไม่แตะ DOM หรือ storage จึงทดสอบด้วย `node --test` ได้
 *
 * วันที่ทุกตัวเป็นสตริง 'YYYY-MM-DD' ตามเวลาท้องถิ่นของเครื่อง (เรียกว่า key)
 * การบวกลบวันใช้เลขวันแบบ UTC จึงไม่เพี้ยนเพราะเวลาออมแสงหรือเขตเวลา
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HabitLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_DAYS = 3660; // เพดานของลูปที่วนตามวัน (~10 ปี) กันค้างเมื่อข้อมูลผิดปกติ
  const MIN_KEY = '2000-01-01';
  const MAX_HABITS = 100;
  const MAX_PAUSES = 50;
  const REST = -1;                 // ค่าใน log ที่หมายถึง "วันหยุด" ของวันนั้น (ไม่ใช่จำนวนครั้ง)
  const MILESTONES = [7, 30, 100]; // สตรีคที่ได้เหรียญ (วัน)

  const HUES = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red'];
  const THEMES = ['system', 'light', 'dark'];

  const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const TH_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // ---------- วันที่ ----------

  const pad2 = (n) => String(n).padStart(2, '0');

  /** Date (เวลาท้องถิ่น) -> key */
  function toKey(date) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m เริ่มที่ 1; วันที่ 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้
  }

  function isKey(s) {
    const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
    if (!m) return false;
    const mo = +m[2];
    const d = +m[3];
    return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(+m[1], mo);
  }

  function parseKey(key) {
    return { y: +key.slice(0, 4), m: +key.slice(5, 7), d: +key.slice(8, 10) };
  }

  function dayNum(key) {
    const { y, m, d } = parseKey(key);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  function fromDayNum(n) {
    const dt = new Date(n * 86400000);
    return `${String(dt.getUTCFullYear()).padStart(4, '0')}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }

  const addDays = (key, n) => fromDayNum(dayNum(key) + n);
  const diffDays = (a, b) => dayNum(a) - dayNum(b);

  /** 0 = อาทิตย์ ... 6 = เสาร์ (1970-01-01 เป็นวันพฤหัสบดี) */
  function weekday(key) {
    return ((((dayNum(key) % 7) + 7) % 7) + 4) % 7;
  }

  const startOfWeek = (key) => addDays(key, -weekday(key));

  /** key ของ n วันล่าสุดเรียงจากเก่าไปใหม่ (วันสุดท้ายคือ todayKey) */
  function lastDays(todayKey, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(addDays(todayKey, -i));
    return out;
  }

  /** ตารางเดือนแบบสัปดาห์เริ่มวันอาทิตย์ ช่องว่างเป็น null (m เริ่มที่ 1) */
  function monthGrid(y, m) {
    const first = `${String(y).padStart(4, '0')}-${pad2(m)}-01`;
    const cells = new Array(weekday(first)).fill(null);
    for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(`${first.slice(0, 8)}${pad2(d)}`);
    while (cells.length % 7) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  /** ตาราง heatmap: คอลัมน์ = สัปดาห์ (เริ่มวันอาทิตย์) แถว = วันในสัปดาห์ วันที่ยังมาไม่ถึงเป็น null */
  function heatmapGrid(todayKey, weeks) {
    const first = addDays(startOfWeek(todayKey), -(weeks - 1) * 7);
    const cols = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const key = addDays(first, w * 7 + d);
        col.push(key <= todayKey ? key : null);
      }
      cols.push(col);
    }
    return cols;
  }

  // ---------- แสดงวันที่ภาษาไทย (ปี พ.ศ.) ----------

  function formatFull(key) {
    const { y, m, d } = parseKey(key);
    return `วัน${TH_DAYS[weekday(key)]}ที่ ${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
  }

  function formatShort(key) {
    const { m, d } = parseKey(key);
    return `${TH_DAYS_SHORT[weekday(key)]} ${d} ${TH_MONTHS_SHORT[m - 1]}`;
  }

  function formatDayMonth(key) {
    const { m, d } = parseKey(key);
    return `${d} ${TH_MONTHS_SHORT[m - 1]}`;
  }

  const formatMonthYear = (y, m) => `${TH_MONTHS[m - 1]} ${y + 543}`;

  function relativeLabel(key, todayKey) {
    const diff = diffDays(todayKey, key);
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'เมื่อวาน';
    return `วัน${TH_DAYS[weekday(key)]}`;
  }

  // ---------- นิสัยหนึ่งรายการ ----------
  // habit = { id, name, icon, color, days:[0-6], target, unit, created, remind:'HH:MM'|'',
  //           paused:[{from, to|null}], log:{ [key]: จำนวนครั้ง หรือ -1 = วันหยุด } }

  /** วันนี้อยู่ในช่วงที่พักนิสัยอยู่หรือไม่ (to = null คือพักต่อเนื่องจนกว่าจะกลับมาทำ) */
  const isPaused = (h, key) => !!h.paused && h.paused.some((p) => key >= p.from && (p.to === null || key <= p.to));
  const isScheduled = (h, key) => key >= h.created && h.days.indexOf(weekday(key)) !== -1 && !isPaused(h, key);
  const isRest = (h, key) => h.log[key] === REST;
  const countOn = (h, key) => (h.log[key] > 0 ? h.log[key] : 0);
  const isDone = (h, key) => countOn(h, key) >= h.target;
  /** วันนั้นต้องทำจริง: อยู่ในตาราง ไม่ได้พักนิสัย และไม่ได้ตั้งเป็นวันหยุด (ใช้นับสตรีคและอัตราสำเร็จ) */
  const isDue = (h, key) => isScheduled(h, key) && !isRest(h, key);
  /** แสดงในรายการของวันนั้นหรือไม่: อยู่ในตาราง หรือมีบันทึกอยู่แล้ว (ไม่ให้บันทึกหายไปจากหน้าจอ) */
  const showsOn = (h, key) => isScheduled(h, key) || countOn(h, key) > 0 || isRest(h, key);

  /** เริ่มพักนิสัยตั้งแต่วัน key (ถ้ายังไม่ได้พักอยู่) */
  function pauseHabit(h, key) {
    if (!h.paused) h.paused = [];
    if (!h.paused.some((p) => p.to === null)) h.paused.push({ from: key, to: null });
  }

  /** กลับมาทำต่อตั้งแต่วัน key: ช่วงที่พักจบที่วันก่อนหน้า (ถ้าพักแล้วกลับมาวันเดียวกัน ช่วงนั้นถูกลบทิ้ง) */
  function resumeHabit(h, key) {
    const prev = addDays(key, -1);
    h.paused = (h.paused || [])
      .map((p) => (p.to === null || p.to >= key ? { from: p.from, to: p.from <= prev ? prev : null } : p))
      .filter((p) => p.to !== null || p.from < key);
  }

  /** สรุปของวันหนึ่ง นับเฉพาะนิสัยที่อยู่ในตารางของวันนั้น */
  function daySummary(habits, key) {
    let total = 0;
    let done = 0;
    for (const h of habits) {
      if (!isDue(h, key)) continue;
      total++;
      if (isDone(h, key)) done++;
    }
    return { total, done, pct: total ? done / total : null };
  }

  /**
   * จำนวนวันที่ทำต่อเนื่องจนถึงวันนี้ ข้ามวันที่ไม่อยู่ในตาราง รวมถึงวันหยุดและช่วงที่พักนิสัย (ไม่ทำให้สตรีคขาด)
   * วันนี้ที่ยังไม่ได้ทำไม่ทำให้สตรีคขาด (ยังมีเวลาทำ) แต่ถ้าทำแล้วก็นับเพิ่ม
   */
  function currentStreak(h, todayKey) {
    let streak = 0;
    let key = todayKey;
    for (let i = 0; i < MAX_DAYS && key >= h.created; i++, key = addDays(key, -1)) {
      if (!isDue(h, key)) continue;
      if (isDone(h, key)) streak++;
      else if (key !== todayKey) break;
    }
    return streak;
  }

  /** สตรีคที่ยาวที่สุดตลอดช่วงที่ติดตามมา (ข้ามวันหยุดและช่วงที่พักเหมือนสตรีคปัจจุบัน) */
  function bestStreak(h, todayKey) {
    const limit = addDays(todayKey, -(MAX_DAYS - 1));
    let key = h.created > limit ? h.created : limit;
    let best = 0;
    let run = 0;
    for (; key <= todayKey; key = addDays(key, 1)) {
      if (!isDue(h, key)) continue;
      if (isDone(h, key)) {
        run++;
        if (run > best) best = run;
      } else if (key !== todayKey) {
        run = 0;
      }
    }
    return best;
  }

  /** จำนวนวันที่ทำครบเป้าหมายทั้งหมด */
  function totalDone(h) {
    let n = 0;
    for (const key of Object.keys(h.log)) if (h.log[key] >= h.target) n++;
    return n;
  }

  /** วันที่อยู่ในตารางและวันที่ทำครบ ในช่วง fromKey..toKey (รวมปลายทั้งสอง) */
  function rangeStats(h, fromKey, toKey) {
    let scheduled = 0;
    let done = 0;
    let key = fromKey > h.created ? fromKey : h.created;
    for (let i = 0; i < MAX_DAYS && key <= toKey; i++, key = addDays(key, 1)) {
      if (!isDue(h, key)) continue;
      scheduled++;
      if (isDone(h, key)) done++;
    }
    return { scheduled, done };
  }

  function overallStats(habits, fromKey, toKey) {
    const sum = { scheduled: 0, done: 0 };
    for (const h of habits) {
      const s = rangeStats(h, fromKey, toKey);
      sum.scheduled += s.scheduled;
      sum.done += s.done;
    }
    return sum;
  }

  /** เปอร์เซ็นต์ปัดเป็นจำนวนเต็ม หรือ null ถ้าไม่มีวันในตารางเลย */
  const percent = (s) => (s.scheduled ? Math.round((s.done / s.scheduled) * 100) : null);

  /** หลักชัยสตรีคที่เพิ่งข้ามไปเมื่อสตรีคเปลี่ยนจาก before เป็น after (ได้เหรียญสูงสุดที่ข้ามในครั้งเดียว) หรือ null */
  function crossedMilestone(before, after) {
    let hit = null;
    for (const t of MILESTONES) if (before < t && after >= t) hit = t;
    return hit;
  }

  /** เหรียญที่เคยได้แล้ว นับจากสตรีคสูงสุด */
  function earnedMilestones(h, todayKey) {
    const best = bestStreak(h, todayKey);
    return MILESTONES.filter((t) => best >= t);
  }

  /**
   * เทียบ 7 วันล่าสุด (รวมวันนี้) กับ 7 วันก่อนหน้า ทั้งภาพรวมและรายนิสัย
   * ค่าเป็นเปอร์เซ็นต์ปัดเศษ หรือ null ถ้าช่วงนั้นไม่มีวันที่ต้องทำเลย; delta = เปลี่ยนไปกี่จุดเปอร์เซ็นต์
   */
  function weekCompare(habits, todayKey) {
    const nowFrom = addDays(todayKey, -6);
    const prevFrom = addDays(todayKey, -13);
    const prevTo = addDays(todayKey, -7);
    const diff = (a, b) => (a !== null && b !== null ? a - b : null);
    const now = percent(overallStats(habits, nowFrom, todayKey));
    const prev = percent(overallStats(habits, prevFrom, prevTo));
    const rows = [];
    for (const h of habits) {
      const a = percent(rangeStats(h, nowFrom, todayKey));
      const b = percent(rangeStats(h, prevFrom, prevTo));
      if (a === null && b === null) continue;
      rows.push({ id: h.id, now: a, prev: b, delta: diff(a, b) });
    }
    return { now, prev, delta: diff(now, prev), rows };
  }

  function describeDays(days) {
    const key = days.join(',');
    if (days.length === 7) return 'ทุกวัน';
    if (key === '1,2,3,4,5') return 'จันทร์–ศุกร์';
    if (key === '0,6') return 'เสาร์–อาทิตย์';
    return days.map((d) => TH_DAYS_SHORT[d]).join(' ');
  }

  const unitOf = (h) => h.unit || 'ครั้ง';

  function describeGoal(h) {
    return h.target > 1 ? `${h.target} ${unitOf(h)}/วัน` : 'วันละครั้ง';
  }

  // ---------- ไฟล์เตือนสำหรับปฏิทินมือถือ (.ics) ----------

  const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  /** พับบรรทัดไม่ให้เกิน 75 ไบต์ UTF-8 ตามมาตรฐาน iCalendar โดยไม่ตัดกลางตัวอักษร (บรรทัดต่อมาขึ้นต้นด้วยช่องว่าง 1 ตัว) */
  function icsFold(line) {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const parts = [];
    let cur = '';
    let bytes = 0;
    let limit = 75;
    for (const ch of line) {
      const n = enc.encode(ch).length;
      if (bytes + n > limit) {
        parts.push(cur);
        cur = '';
        bytes = 0;
        limit = 74;
      }
      cur += ch;
      bytes += n;
    }
    parts.push(cur);
    return parts.join('\r\n ');
  }

  /**
   * สร้างไฟล์ปฏิทินที่เตือนซ้ำตามวันของแต่ละนิสัยที่ตั้งเวลา remind ไว้ (เวลาแบบ "ตามเครื่อง" ไม่ผูกเขตเวลา)
   * stampUtc เช่น 20261002T170000Z; appUrl (ถ้ามี) ใส่เป็นลิงก์ในกิจกรรมให้แตะเปิดแอปได้
   */
  function buildIcs(habits, todayKey, stampUtc, appUrl) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//habit-tracker//TH', 'CALSCALE:GREGORIAN'];
    for (const h of habits) {
      if (!h.remind) continue;
      let first = todayKey;
      for (let i = 0; i < 7 && h.days.indexOf(weekday(first)) === -1; i++) first = addDays(first, 1);
      const start = `${first.replace(/-/g, '')}T${h.remind.replace(':', '')}00`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:habit-${h.id}@habit-tracker`,
        `DTSTAMP:${stampUtc}`,
        `DTSTART:${start}`,
        'DURATION:PT15M',
        h.days.length === 7 ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=WEEKLY;BYDAY=${h.days.map((d) => ICS_DAYS[d]).join(',')}`,
        `SUMMARY:${icsEscape(`${h.icon} ${h.name}`)}`,
        `DESCRIPTION:${icsEscape('ถึงเวลาทำนิสัยนี้แล้ว เปิดแอปนิสัยประจำวันเพื่อติ๊กเมื่อทำเสร็จ')}`,
      );
      if (appUrl) lines.push(`URL:${appUrl}`);
      lines.push('BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(h.name)}`, 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  // ---------- ตรวจและทำความสะอาดข้อมูล (ใช้ตอนโหลดและนำเข้า) ----------

  function clampInt(v, min, max, fallback) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function cleanText(v, max) {
    if (typeof v !== 'string') return '';
    return Array.from(v.trim().replace(/\s+/g, ' ')).slice(0, max).join('');
  }

  function normalizeDays(v) {
    const set = new Set();
    if (Array.isArray(v)) for (const d of v) if (Number.isInteger(d) && d >= 0 && d <= 6) set.add(d);
    return set.size ? Array.from(set).sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
  }

  const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id);

  /** ช่วงที่พักนิสัย: เรียงตามวันเริ่ม ตัดช่วงที่ผิดรูป และเหลือช่วงที่ยังพักอยู่ (to = null) ได้ช่วงเดียว */
  function normalizePaused(v) {
    const list = [];
    if (Array.isArray(v)) {
      for (const p of v) {
        if (!p || !isKey(p.from) || p.from < MIN_KEY) continue;
        const open = p.to === null || p.to === undefined;
        if (!open && (!isKey(p.to) || p.to < p.from)) continue;
        list.push({ from: p.from, to: open ? null : p.to });
      }
    }
    list.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    let lastOpen = -1;
    list.forEach((p, i) => { if (p.to === null) lastOpen = i; });
    return list.filter((p, i) => p.to !== null || i === lastOpen).slice(-MAX_PAUSES);
  }

  /** คืน habit ที่สะอาดแล้ว หรือ null ถ้าไม่มีชื่อ (id ปล่อยให้ normalizeState จัดการ) */
  function normalizeHabit(raw, todayKey) {
    if (!raw || typeof raw !== 'object') return null;
    const name = cleanText(raw.name, 40);
    if (!name) return null;

    const latest = addDays(todayKey, 2); // เผื่อเครื่องที่ตั้งเขตเวลาเร็วกว่า
    const log = {};
    if (raw.log && typeof raw.log === 'object') {
      for (const key of Object.keys(raw.log)) {
        if (!isKey(key) || key < MIN_KEY || key > latest) continue;
        if (raw.log[key] === REST) { log[key] = REST; continue; }
        const n = clampInt(raw.log[key], 0, 99, 0);
        if (n > 0) log[key] = n;
      }
    }

    let created = isKey(raw.created) && raw.created >= MIN_KEY ? raw.created : todayKey;
    if (created > todayKey) created = todayKey;
    const earliest = Object.keys(log).sort()[0];
    if (earliest && earliest < created) created = earliest;

    return {
      id: raw.id,
      name,
      icon: Array.from(typeof raw.icon === 'string' ? raw.icon.trim() : '').slice(0, 8).join('') || '⭐',
      color: HUES.indexOf(raw.color) !== -1 ? raw.color : 'blue',
      days: normalizeDays(raw.days),
      target: clampInt(raw.target, 1, 99, 1),
      unit: cleanText(raw.unit, 12),
      remind: typeof raw.remind === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.remind) ? raw.remind : '',
      created,
      paused: normalizePaused(raw.paused),
      log,
    };
  }

  /** genId() ต้องคืน id ใหม่ทุกครั้งที่เรียก */
  function normalizeState(raw, todayKey, genId) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const used = new Set();
    const habits = [];
    for (const item of Array.isArray(src.habits) ? src.habits : []) {
      if (habits.length >= MAX_HABITS) break;
      const h = normalizeHabit(item, todayKey);
      if (!h) continue;
      while (!validId(h.id) || used.has(h.id)) h.id = genId();
      used.add(h.id);
      habits.push(h);
    }
    const theme = src.settings && THEMES.indexOf(src.settings.theme) !== -1 ? src.settings.theme : 'system';
    return { version: 1, habits, settings: { theme } };
  }

  return {
    HUES, THEMES, MAX_DAYS, MAX_HABITS, REST, MILESTONES,
    TH_MONTHS, TH_MONTHS_SHORT, TH_DAYS, TH_DAYS_SHORT,
    toKey, isKey, parseKey, addDays, diffDays, weekday, startOfWeek, daysInMonth,
    lastDays, monthGrid, heatmapGrid,
    formatFull, formatShort, formatDayMonth, formatMonthYear, relativeLabel,
    isPaused, isScheduled, isRest, isDue, countOn, isDone, showsOn, daySummary,
    pauseHabit, resumeHabit,
    currentStreak, bestStreak, totalDone, rangeStats, overallStats, percent,
    crossedMilestone, earnedMilestones, weekCompare,
    buildIcs, icsEscape, icsFold,
    describeDays, describeGoal, unitOf,
    normalizeHabit, normalizeState,
  };
});
