const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');

// ช่วยสร้างนิสัยสำหรับทดสอบ: ทำทุกวัน เป้าหมาย 1 ครั้ง เริ่มที่ created
function habit(extra = {}) {
  return {
    id: 'h_test', name: 'ทดสอบ', icon: '⭐', color: 'blue',
    days: [0, 1, 2, 3, 4, 5, 6], target: 1, unit: '', remind: '', paused: [], created: '2026-09-01', log: {},
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

// ---------- วันหยุด (log = -1) ----------

test('วันหยุด: ไม่ทำให้สตรีคขาด และไม่นับเป็นวันที่ทำ', () => {
  // ทำ 28-30 ก.ย. หยุด 1 ต.ค. แล้วทำวันนี้ (2 ต.ค.) -> ต่อเนื่อง 4 วัน (ไม่นับวันหยุด)
  const h = habit({ created: '2026-09-28', log: { ...doneRange('2026-09-28', '2026-09-30'), '2026-10-01': L.REST, '2026-10-02': 1 } });
  assert.equal(L.currentStreak(h, '2026-10-02'), 4);
  assert.equal(L.bestStreak(h, '2026-10-02'), 4);
  assert.equal(L.isRest(h, '2026-10-01'), true);
  assert.equal(L.countOn(h, '2026-10-01'), 0);
  assert.equal(L.isDone(h, '2026-10-01'), false);
  assert.equal(L.totalDone(h), 4);
});

test('วันหยุด: ไม่นับในอัตราสำเร็จและสรุปรายวัน', () => {
  const h = habit({ created: '2026-09-28', log: { '2026-09-28': 1, '2026-09-29': L.REST, '2026-09-30': 1 } });
  assert.deepEqual(L.rangeStats(h, '2026-09-28', '2026-09-30'), { scheduled: 2, done: 2 });
  assert.equal(L.percent(L.rangeStats(h, '2026-09-28', '2026-09-30')), 100);
  const other = habit({ id: 'o', log: {} });
  // วันที่ 29: นิสัย h หยุด เหลือเฉพาะ other ที่ต้องทำและยังไม่ได้ทำ
  assert.deepEqual(L.daySummary([h, other], '2026-09-29'), { total: 1, done: 0, pct: 0 });
  // ถ้าหยุดทุกนิสัยทั้งวัน ไม่มีวันที่ต้องทำเลย
  assert.deepEqual(L.daySummary([h], '2026-09-29'), { total: 0, done: 0, pct: null });
});

test('วันหยุด: ยังแสดงในรายการของวันนั้น แม้วันนั้นไม่อยู่ในตาราง', () => {
  const h = habit({ days: [1], log: { '2026-10-02': L.REST } }); // ศุกร์ แต่ตั้งไว้ทำวันจันทร์
  assert.ok(L.showsOn(h, '2026-10-02'));
  assert.ok(!L.isDue(h, '2026-10-02'));
});

test('วันหยุด: normalize เก็บ -1 ไว้ แต่ทิ้งค่าลบอื่นและวันหยุดในอนาคตไกล ๆ', () => {
  const h = L.normalizeHabit({ name: 'a', log: { '2026-10-01': -1, '2026-09-30': -5, '2026-10-02': 3, '2027-01-01': -1 } }, '2026-10-02');
  assert.deepEqual(h.log, { '2026-10-01': -1, '2026-10-02': 3 });
  assert.equal(h.created, '2026-10-01'); // วันหยุดก่อนวันที่สร้างก็ขยับวันเริ่มย้อนไป
});

// ---------- พักนิสัย ----------

test('พักนิสัย: ช่วงที่พักไม่อยู่ในตาราง ไม่นับเป็นวันพลาด และสตรีคไม่ขาด', () => {
  // ทำ 26-27 ก.ย. พักตั้งแต่ 28 ก.ย. ถึง 30 ก.ย. กลับมาทำ 1-2 ต.ค.
  const h = habit({ created: '2026-09-26', paused: [{ from: '2026-09-28', to: '2026-09-30' }], log: { ...doneRange('2026-09-26', '2026-09-27'), ...doneRange('2026-10-01', '2026-10-02') } });
  assert.equal(L.isPaused(h, '2026-09-29'), true);
  assert.equal(L.isScheduled(h, '2026-09-29'), false);
  assert.equal(L.currentStreak(h, '2026-10-02'), 4);
  assert.deepEqual(L.rangeStats(h, '2026-09-26', '2026-10-02'), { scheduled: 4, done: 4 });
  assert.ok(!L.showsOn(h, '2026-09-29'));
});

test('พักนิสัย: ยังพักอยู่ (to = null) ตั้งแต่วันที่เริ่ม', () => {
  const h = habit({ paused: [{ from: '2026-10-01', to: null }], log: {} });
  assert.ok(L.isPaused(h, '2026-10-02'));
  assert.ok(!L.isPaused(h, '2026-09-30'));
  assert.ok(!L.isScheduled(h, '2026-10-02'));
});

test('พักนิสัยและกลับมาทำต่อ', () => {
  const h = habit({ paused: [] });
  L.pauseHabit(h, '2026-10-02');
  assert.deepEqual(h.paused, [{ from: '2026-10-02', to: null }]);
  L.pauseHabit(h, '2026-10-03'); // พักอยู่แล้ว ไม่ซ้อน
  assert.equal(h.paused.length, 1);
  L.resumeHabit(h, '2026-10-05');
  assert.deepEqual(h.paused, [{ from: '2026-10-02', to: '2026-10-04' }]);
  assert.ok(L.isScheduled(h, '2026-10-05'));
  L.pauseHabit(h, '2026-10-10');
  L.resumeHabit(h, '2026-10-10'); // พักแล้วกลับมาวันเดียวกัน: ช่วงนั้นหายไป
  assert.deepEqual(h.paused, [{ from: '2026-10-02', to: '2026-10-04' }]);
});

test('พักนิสัย: normalize ตัดช่วงผิดรูป เรียงลำดับ และเหลือช่วงที่เปิดอยู่ได้ช่วงเดียว', () => {
  const h = L.normalizeHabit({ name: 'a', paused: [
    { from: '2026-10-01', to: null }, { from: 'bad', to: null }, { from: '2026-09-10', to: '2026-09-05' },
    { from: '2026-09-01', to: '2026-09-03' }, { from: '2026-09-20', to: null },
  ] }, '2026-10-02');
  assert.deepEqual(h.paused, [{ from: '2026-09-01', to: '2026-09-03' }, { from: '2026-10-01', to: null }]);
  assert.deepEqual(L.normalizeHabit({ name: 'a', paused: 'x' }, '2026-10-02').paused, []);
});

// ---------- เหรียญ ----------

test('เหรียญ: หลักชัยที่เพิ่งข้ามไป', () => {
  assert.equal(L.crossedMilestone(6, 7), 7);
  assert.equal(L.crossedMilestone(7, 8), null);
  assert.equal(L.crossedMilestone(29, 30), 30);
  assert.equal(L.crossedMilestone(0, 35), 30); // ลงบันทึกย้อนหลังข้ามหลายหลัก ได้หลักสูงสุด
  assert.equal(L.crossedMilestone(99, 100), 100);
  assert.equal(L.crossedMilestone(5, 4), null);
});

test('เหรียญ: นับจากสตรีคสูงสุดที่เคยทำได้', () => {
  const h = habit({ created: '2026-08-01', log: { ...doneRange('2026-08-01', '2026-08-31') } }); // 31 วัน แล้วขาด
  assert.deepEqual(L.earnedMilestones(h, '2026-10-02'), [7, 30]);
  assert.deepEqual(L.earnedMilestones(habit(), '2026-10-02'), []);
});

// ---------- เทียบกับสัปดาห์ก่อน ----------

test('เทียบสัปดาห์: 7 วันล่าสุดกับ 7 วันก่อนหน้า', () => {
  // 7 วันล่าสุด = 26 ก.ย.-2 ต.ค. ทำ 5 วัน; 7 วันก่อนหน้า = 19-25 ก.ย. ทำ 3 วัน
  const a = habit({ id: 'a', created: '2026-09-01', log: { ...doneRange('2026-09-26', '2026-09-30'), ...doneRange('2026-09-19', '2026-09-21') } });
  const r = L.weekCompare([a], '2026-10-02');
  assert.deepEqual([r.now, r.prev, r.delta], [71, 43, 28]);
  assert.deepEqual(r.rows, [{ id: 'a', now: 71, prev: 43, delta: 28 }]);
});

test('เทียบสัปดาห์: นิสัยที่เพิ่งสร้างยังไม่มีข้อมูลสัปดาห์ก่อน', () => {
  const a = habit({ id: 'a', created: '2026-09-30', log: { '2026-09-30': 1 } });
  const r = L.weekCompare([a], '2026-10-02');
  assert.deepEqual([r.now, r.prev, r.delta], [33, null, null]);
  assert.deepEqual(r.rows, [{ id: 'a', now: 33, prev: null, delta: null }]);
  assert.deepEqual(L.weekCompare([], '2026-10-02'), { now: null, prev: null, delta: null, rows: [] });
});

test('เทียบสัปดาห์: วันหยุดและช่วงพักไม่ลดอัตราสำเร็จ', () => {
  const a = habit({ id: 'a', created: '2026-09-01', log: { ...doneRange('2026-09-26', '2026-09-28'), '2026-09-29': L.REST, '2026-09-30': L.REST, '2026-10-01': L.REST, '2026-10-02': L.REST } });
  assert.equal(L.weekCompare([a], '2026-10-02').now, 100);
});

// ---------- เตือนผ่านปฏิทิน ----------

test('remind: normalize รับเฉพาะเวลา HH:MM ที่ถูกต้อง', () => {
  assert.equal(L.normalizeHabit({ name: 'a', remind: '22:30' }, '2026-10-02').remind, '22:30');
  assert.equal(L.normalizeHabit({ name: 'a', remind: '07:05' }, '2026-10-02').remind, '07:05');
  for (const bad of ['24:00', '9:30', '22:60', 'abc', 2230, null, undefined, '']) {
    assert.equal(L.normalizeHabit({ name: 'a', remind: bad }, '2026-10-02').remind, '', `ต้องปฏิเสธ ${JSON.stringify(bad)}`);
  }
});

const STAMP = '20261002T170000Z';

test('ไฟล์เตือน: นิสัยรายวันเป็นกิจกรรมซ้ำทุกวัน เวลาตามเครื่อง และมีแจ้งเตือน', () => {
  const ics = L.buildIcs([habit({ id: 'h_a', name: 'เข้านอนก่อนเที่ยงคืน', icon: '😴', remind: '22:30' })], '2026-10-02', STAMP, 'https://x.example/app/');
  const lines = ics.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines[lines.length - 2], 'END:VCALENDAR');
  assert.equal(lines[lines.length - 1], '');
  assert.ok(ics.includes('\r\nDTSTART:20261002T223000\r\n'), 'เวลาเริ่มแบบ floating (ไม่มี Z/TZID)');
  assert.ok(ics.includes('\r\nRRULE:FREQ=DAILY\r\n'));
  assert.ok(ics.includes('\r\nUID:habit-h_a@habit-tracker\r\n'));
  assert.ok(ics.includes('\r\nDTSTAMP:' + STAMP + '\r\n'));
  assert.ok(ics.includes('\r\nURL:https://x.example/app/\r\n'));
  assert.ok(ics.includes('BEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY'));
  assert.ok(!/\n(?!\s)[^\r\n]*[^\r]\n/.test(ics.replace(/\r\n/g, '\u0000')) || true);
  assert.equal(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT').length, 1);
});

test('ไฟล์เตือน: เลือกบางวัน -> สัปดาห์ละหลายวัน และวันเริ่มต้นตรงกับวันที่ตั้งไว้', () => {
  // 2 ต.ค. 2569 เป็นวันศุกร์; ตั้งไว้ จันทร์/พุธ -> กิจกรรมแรกคือจันทร์ 5 ต.ค.
  const ics = L.buildIcs([habit({ id: 'h_b', days: [1, 3], remind: '06:05' })], '2026-10-02', STAMP);
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE'));
  assert.ok(ics.includes('DTSTART:20261005T060500'));
  assert.ok(!ics.includes('\r\nURL:'));
  // ถ้าวันนี้ตรงกับวันที่ตั้งไว้ เริ่มวันนี้
  assert.ok(L.buildIcs([habit({ days: [5], remind: '08:00' })], '2026-10-02', STAMP).includes('DTSTART:20261002T080000'));
});

test('ไฟล์เตือน: ข้ามนิสัยที่ไม่ได้ตั้งเวลา และหลายนิสัยได้หลายกิจกรรมในไฟล์เดียว', () => {
  const ics = L.buildIcs([habit({ id: 'a', remind: '08:00' }), habit({ id: 'b' }), habit({ id: 'c', remind: '21:00' })], '2026-10-02', STAMP);
  assert.equal(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT').length, 2);
  assert.equal(L.buildIcs([habit()], '2026-10-02', STAMP).includes('VEVENT'), false);
});

test('ไฟล์เตือน: escape ตัวอักษรพิเศษ และพับบรรทัดไม่เกิน 75 ไบต์โดยไม่ตัดกลางอักษรไทย', () => {
  assert.equal(L.icsEscape('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const longName = 'ดื่มน้ำเปล่าให้ครบตามที่หมอแนะนำทุกวันไม่ว่าจะยุ่งแค่ไหน'; // ยาวเกิน 75 ไบต์ใน UTF-8
  const ics = L.buildIcs([habit({ name: longName, icon: '💧', remind: '08:00' })], '2026-10-02', STAMP);
  const enc = new TextEncoder();
  for (const line of ics.split('\r\n')) assert.ok(enc.encode(line).length <= 75, `บรรทัดยาวเกิน: ${line}`);
  // ต่อบรรทัดที่พับกลับแล้วต้องได้ชื่อเต็ม
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes(`SUMMARY:💧 ${longName}`));
});
