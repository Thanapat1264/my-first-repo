const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');

// ช่วยสร้างนิสัยสำหรับทดสอบ: ทำทุกวัน เป้าหมาย 1 ครั้ง เริ่มที่ created
function habit(extra = {}) {
  return {
    id: 'h_test', name: 'ทดสอบ', icon: '⭐', color: 'blue',
    days: [0, 1, 2, 3, 4, 5, 6], target: 1, unit: '', created: '2026-09-01', log: {},
    ...extra,
  };
}

// log ที่ทำครบทุกวันตั้งแต่ from ถึง to
function doneRange(from, to, n = 1) {
  const log = {};
  for (let k = from; k <= to; k = L.addDays(k, 1)) log[k] = n;
  return log;
}

test('วันที่: บวกลบข้ามเดือน ปี และปีอธิกสุรทิน', () => {
  assert.equal(L.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(L.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(L.addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(L.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(L.addDays('2026-10-02', -365), '2025-10-02');
  assert.equal(L.diffDays('2026-10-02', '2026-09-25'), 7);
});

test('วันที่: วันในสัปดาห์ถูกต้อง (0 = อาทิตย์)', () => {
  assert.equal(L.weekday('1970-01-01'), 4); // พฤหัสบดี
  assert.equal(L.weekday('2026-10-02'), 5); // ศุกร์
  assert.equal(L.weekday('2026-10-04'), 0); // อาทิตย์
  assert.equal(L.weekday('1969-12-31'), 3); // พุธ (ก่อน epoch)
  assert.equal(L.startOfWeek('2026-10-02'), '2026-09-27');
});

test('วันที่: isKey ปฏิเสธวันที่ที่ไม่มีจริง', () => {
  assert.ok(L.isKey('2026-10-02'));
  assert.ok(L.isKey('2024-02-29'));
  assert.ok(!L.isKey('2026-02-29'));
  assert.ok(!L.isKey('2026-13-01'));
  assert.ok(!L.isKey('2026-1-1'));
  assert.ok(!L.isKey(20261002));
  assert.ok(!L.isKey(null));
});

test('วันที่: toKey ใช้เวลาท้องถิ่น ไม่ใช่ UTC', () => {
  // 00:30 ตามเวลาท้องถิ่นของวันที่ 2 ต.ค. ต้องได้วันที่ 2 เสมอ ไม่ว่าเขตเวลาใด
  assert.equal(L.toKey(new Date(2026, 9, 2, 0, 30)), '2026-10-02');
  assert.equal(L.toKey(new Date(2026, 9, 2, 23, 59)), '2026-10-02');
  assert.equal(L.toKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('แสดงวันที่ภาษาไทยเป็นปี พ.ศ.', () => {
  assert.equal(L.formatFull('2026-10-02'), 'วันศุกร์ที่ 2 ตุลาคม 2569');
  assert.equal(L.formatShort('2026-10-02'), 'ศ. 2 ต.ค.');
  assert.equal(L.formatDayMonth('2026-10-02'), '2 ต.ค.');
  assert.equal(L.formatMonthYear(2026, 10), 'ตุลาคม 2569');
  assert.equal(L.relativeLabel('2026-10-02', '2026-10-02'), 'วันนี้');
  assert.equal(L.relativeLabel('2026-10-01', '2026-10-02'), 'เมื่อวาน');
  assert.equal(L.relativeLabel('2026-09-30', '2026-10-02'), 'วันพุธ');
});

test('ตารางเดือน: เริ่มวันอาทิตย์ และเติมช่องว่างครบสัปดาห์', () => {
  const weeks = L.monthGrid(2026, 10); // 1 ต.ค. 2569 เป็นวันพฤหัสบดี
  assert.deepEqual(weeks[0].slice(0, 5), [null, null, null, null, '2026-10-01']);
  assert.equal(weeks.flat().filter(Boolean).length, 31);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(L.monthGrid(2026, 2).flat().filter(Boolean).length, 28);
  assert.equal(L.monthGrid(2024, 2).flat().filter(Boolean).length, 29);
});

test('ตาราง heatmap: คอลัมน์สุดท้ายคือสัปดาห์นี้ และวันในอนาคตเป็น null', () => {
  const cols = L.heatmapGrid('2026-10-02', 12); // ศุกร์
  assert.equal(cols.length, 12);
  assert.equal(cols[11][0], '2026-09-27'); // อาทิตย์ของสัปดาห์นี้
  assert.equal(cols[11][5], '2026-10-02'); // วันนี้
  assert.equal(cols[11][6], null); // เสาร์ยังมาไม่ถึง
  assert.equal(cols[0][0], '2026-07-12');
});

test('lastDays: เรียงจากเก่าไปใหม่ และจบที่วันนี้', () => {
  assert.deepEqual(L.lastDays('2026-10-02', 3), ['2026-09-30', '2026-10-01', '2026-10-02']);
});

test('ตารางวัน: นับเฉพาะวันที่ตรงกับ days และตั้งแต่วันที่สร้าง', () => {
  const h = habit({ days: [1, 3, 5], created: '2026-09-28' }); // จ. พ. ศ.
  assert.ok(L.isScheduled(h, '2026-10-02')); // ศุกร์
  assert.ok(!L.isScheduled(h, '2026-10-03')); // เสาร์
  assert.ok(!L.isScheduled(h, '2026-09-25')); // ก่อนวันที่สร้าง (ศุกร์)
});

test('showsOn: วันนอกตารางที่มีบันทึกยังแสดงอยู่ ไม่ให้ข้อมูลหาย', () => {
  const h = habit({ days: [1], log: { '2026-10-03': 1 } }); // จ. อย่างเดียว แต่ทำวันเสาร์
  assert.ok(L.showsOn(h, '2026-10-03'));
  assert.ok(!L.showsOn(h, '2026-10-02'));
});

test('สตรีคปัจจุบัน: วันนี้ยังไม่ทำไม่ทำให้สตรีคขาด', () => {
  const h = habit({ log: doneRange('2026-09-28', '2026-10-01') });
  assert.equal(L.currentStreak(h, '2026-10-02'), 4);
  h.log['2026-10-02'] = 1;
  assert.equal(L.currentStreak(h, '2026-10-02'), 5);
});

test('สตรีคปัจจุบัน: ขาดเมื่อพลาดวันที่ผ่านมา', () => {
  const log = doneRange('2026-09-20', '2026-09-28');
  Object.assign(log, doneRange('2026-09-30', '2026-10-02')); // พลาดวันที่ 29
  assert.equal(L.currentStreak(habit({ log }), '2026-10-02'), 3);
});

test('สตรีค: ข้ามวันที่ไม่อยู่ในตาราง (จันทร์-ศุกร์)', () => {
  // 2026-09-28 (จ.) ถึง 2026-10-02 (ศ.) ทำครบ แล้วเสาร์-อาทิตย์ไม่ต้องทำ ต่อด้วยจันทร์ 5 ต.ค.
  const log = { ...doneRange('2026-09-21', '2026-09-25'), ...doneRange('2026-09-28', '2026-10-02'), '2026-10-05': 1 };
  const h = habit({ days: [1, 2, 3, 4, 5], created: '2026-09-21', log });
  assert.equal(L.currentStreak(h, '2026-10-05'), 11);
  assert.equal(L.bestStreak(h, '2026-10-05'), 11);
});

test('สตรีค: เป้าหมายหลายครั้งต้องครบเป้าหมายถึงนับ', () => {
  const h = habit({ target: 8, unit: 'แก้ว', log: { '2026-10-01': 8, '2026-10-02': 7 } });
  assert.equal(L.isDone(h, '2026-10-01'), true);
  assert.equal(L.isDone(h, '2026-10-02'), false);
  assert.equal(L.currentStreak(h, '2026-10-02'), 1);
  assert.equal(L.totalDone(h), 1);
});

test('สตรีคสูงสุด: จำช่วงที่ยาวที่สุดแม้ตอนนี้ขาดไปแล้ว', () => {
  const log = { ...doneRange('2026-09-05', '2026-09-14'), ...doneRange('2026-09-20', '2026-09-22') };
  const h = habit({ log });
  assert.equal(L.bestStreak(h, '2026-10-02'), 10);
  assert.equal(L.currentStreak(h, '2026-10-02'), 0);
});

test('สตรีค: นิสัยที่เพิ่งสร้างวันนี้และทำแล้วได้ 1', () => {
  const h = habit({ created: '2026-10-02', log: { '2026-10-02': 1 } });
  assert.equal(L.currentStreak(h, '2026-10-02'), 1);
  assert.equal(L.bestStreak(h, '2026-10-02'), 1);
  assert.equal(L.currentStreak(habit({ created: '2026-10-02' }), '2026-10-02'), 0);
});

test('สถิติช่วงวัน: นับตั้งแต่วันที่สร้างเท่านั้น', () => {
  const h = habit({ created: '2026-09-30', log: { '2026-09-30': 1, '2026-10-02': 1 } });
  const s = L.rangeStats(h, '2026-09-26', '2026-10-02');
  assert.deepEqual(s, { scheduled: 3, done: 2 });
  assert.equal(L.percent(s), 67);
  assert.equal(L.percent({ scheduled: 0, done: 0 }), null);
});

test('สรุปรายวัน: นับเฉพาะนิสัยที่อยู่ในตารางของวันนั้น', () => {
  const a = habit({ id: 'a', log: { '2026-10-02': 1 } });
  const b = habit({ id: 'b' });
  const c = habit({ id: 'c', days: [1] }); // จันทร์เท่านั้น ไม่นับวันศุกร์
  assert.deepEqual(L.daySummary([a, b, c], '2026-10-02'), { total: 2, done: 1, pct: 0.5 });
  assert.deepEqual(L.daySummary([c], '2026-10-02'), { total: 0, done: 0, pct: null });
});

test('สถิติรวม: รวมทุกนิสัย', () => {
  const a = habit({ id: 'a', log: doneRange('2026-09-26', '2026-10-02') });
  const b = habit({ id: 'b', log: { '2026-10-02': 1 } });
  const s = L.overallStats([a, b], '2026-09-26', '2026-10-02');
  assert.deepEqual(s, { scheduled: 14, done: 8 });
});

test('ลูปมีเพดาน: created ผิดปกติไม่ทำให้ค้าง', () => {
  const h = habit({ created: '2000-01-01', log: {} });
  const t0 = Date.now();
  L.currentStreak(h, '2026-10-02');
  L.bestStreak(h, '2026-10-02');
  L.rangeStats(h, '2000-01-01', '2026-10-02');
  assert.ok(Date.now() - t0 < 2000);
});

test('คำอธิบายตารางวันและเป้าหมาย', () => {
  assert.equal(L.describeDays([0, 1, 2, 3, 4, 5, 6]), 'ทุกวัน');
  assert.equal(L.describeDays([1, 2, 3, 4, 5]), 'จันทร์–ศุกร์');
  assert.equal(L.describeDays([0, 6]), 'เสาร์–อาทิตย์');
  assert.equal(L.describeDays([1, 3, 5]), 'จ. พ. ศ.');
  assert.equal(L.describeGoal(habit()), 'วันละครั้ง');
  assert.equal(L.describeGoal(habit({ target: 8, unit: 'แก้ว' })), '8 แก้ว/วัน');
  assert.equal(L.describeGoal(habit({ target: 3 })), '3 ครั้ง/วัน');
});

test('normalizeHabit: ล้างค่าที่ผิดและจำกัดช่วงตัวเลข', () => {
  const h = L.normalizeHabit({
    id: 'x', name: '  อ่านหนังสือ   ทุกวัน  ', icon: '', color: 'nope', days: [9, 'a', 3, 3, 1],
    target: 500, unit: 'x'.repeat(50), created: 'bad', log: { '2026-10-01': 2, 'bad': 1, '2026-10-02': 0, '2026-10-03': -4 },
  }, '2026-10-02');
  assert.equal(h.name, 'อ่านหนังสือ ทุกวัน');
  assert.equal(h.icon, '⭐');
  assert.equal(h.color, 'blue');
  assert.deepEqual(h.days, [1, 3]);
  assert.equal(h.target, 99);
  assert.equal(h.unit.length, 12);
  assert.deepEqual(h.log, { '2026-10-01': 2 });
  assert.equal(h.created, '2026-10-01'); // ย้อนไปวันแรกที่มีบันทึก
});

test('normalizeHabit: ไม่มีชื่อ = ไม่ใช่นิสัย', () => {
  assert.equal(L.normalizeHabit({ name: '   ' }, '2026-10-02'), null);
  assert.equal(L.normalizeHabit(null, '2026-10-02'), null);
  assert.equal(L.normalizeHabit('x', '2026-10-02'), null);
});

test('normalizeHabit: created ในอนาคตถูกดึงกลับเป็นวันนี้ และ days ว่างกลายเป็นทุกวัน', () => {
  const h = L.normalizeHabit({ name: 'a', created: '2030-01-01', days: [] }, '2026-10-02');
  assert.equal(h.created, '2026-10-02');
  assert.deepEqual(h.days, [0, 1, 2, 3, 4, 5, 6]);
});

test('normalizeState: id ซ้ำหรือไม่ถูกต้องถูกสร้างใหม่ ธีมที่ไม่รู้จักกลับเป็น system', () => {
  let n = 0;
  const gen = () => `h_gen${++n}`;
  const s = L.normalizeState({
    habits: [{ id: 'a', name: 'หนึ่ง' }, { id: 'a', name: 'สอง' }, { id: 'bad id!', name: 'สาม' }, { name: '' }],
    settings: { theme: 'neon' },
  }, '2026-10-02', gen);
  assert.deepEqual(s.habits.map((h) => h.id), ['a', 'h_gen1', 'h_gen2']);
  assert.equal(s.settings.theme, 'system');
  assert.equal(s.version, 1);
});

test('normalizeState: รับข้อมูลที่พังโดยไม่ throw', () => {
  for (const bad of [null, undefined, 'x', 42, [], { habits: 'no' }, { habits: [null, 1, 'a'] }]) {
    const s = L.normalizeState(bad, '2026-10-02', () => 'h_new');
    assert.deepEqual(s.habits, []);
  }
});

test('normalizeState: จำกัดจำนวนนิสัยสูงสุด', () => {
  let n = 0;
  const habits = Array.from({ length: 150 }, (_, i) => ({ id: `h${i}`, name: `นิสัย ${i}` }));
  const s = L.normalizeState({ habits }, '2026-10-02', () => `g${++n}`);
  assert.equal(s.habits.length, L.MAX_HABITS);
});
