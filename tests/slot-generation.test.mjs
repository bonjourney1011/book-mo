// Runs the real Apps Script files in a Node sandbox: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

process.env.TZ = 'Asia/Ho_Chi_Minh';

const gs = vm.createContext({});
for (const file of ['text-helpers.gs', 'slot-generation.gs']) {
  vm.runInContext(readFileSync(new URL(`../apps-script/${file}`, import.meta.url), 'utf8'), gs);
}

// Thursday 12/11/2026 10:00
const NOW = new Date(2026, 10, 12, 10, 0);
const windows = [
  { weekday: 'T7', start: '09:00', end: '12:00', active: true },
  { weekday: 'CN', start: '09:00', end: '10:30', active: true },
  { weekday: 'T5', start: '20:00', end: '22:00', active: true },
  { weekday: 'T2', start: '09:00', end: '12:00', active: false }
];
const config = { booking_open: true, slot_minutes: 45, buffer_minutes: 15, lead_days: 1, horizon_days: 14 };
const keys = (slots) => Array.from(slots, (s) => s.key);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('steps 45 + 15 inside a window and never spills past its end', () => {
  const slots = gs.generateSlots(windows, [], config, NOW);
  const sat = keys(slots).filter((k) => k.startsWith('2026-11-14'));
  assert.deepEqual(sat, ['2026-11-14 09:00', '2026-11-14 10:00', '2026-11-14 11:00']);
  const sun = keys(slots).filter((k) => k.startsWith('2026-11-15'));
  assert.deepEqual(sun, ['2026-11-15 09:00']); // 10:00–10:45 would exceed 10:30
});

test('respects lead time (1 day) and horizon (14 days)', () => {
  const all = keys(gs.generateSlots(windows, [], config, NOW));
  assert.ok(!all.includes('2026-11-12 20:00'), 'tonight is inside the lead time');
  assert.ok(all.includes('2026-11-19 20:00'), 'next Thursday is open');
  assert.ok(all.includes('2026-11-21 09:00'), 'Saturday in week 2 is open');
  assert.ok(!all.includes('2026-11-26 20:00'), 'now + 14 days is 26/11 10:00, so 20:00 that day is out');
  assert.ok(!all.includes('2026-12-03 20:00'), 'beyond the horizon');
  assert.ok(!all.some((k) => k.startsWith('2026-11-16')), 'inactive Monday window is skipped');
});

test('lead time is measured in hours, not whole days', () => {
  const lateNow = new Date(2026, 10, 13, 21, 0); // Friday 21:00
  const all = keys(gs.generateSlots(windows, [], config, lateNow));
  assert.ok(!all.includes('2026-11-14 09:00'), 'only 12 h ahead');
  assert.ok(all.includes('2026-11-15 09:00'));
});

test('an active booking removes its slot; a cancelled one frees it', () => {
  const booked = [{ slotKey: '2026-11-14 10:00', status: 'Chờ duyệt' }, { slotKey: '2026-11-14 11:00', status: 'Huỷ' }];
  const sat = keys(gs.generateSlots(windows, booked, config, NOW)).filter((k) => k.startsWith('2026-11-14'));
  assert.deepEqual(sat, ['2026-11-14 09:00', '2026-11-14 11:00']);
  assert.equal(gs.isActiveBooking({ status: 'Hủy' }), false);
  assert.equal(gs.isActiveBooking({ status: 'Đã xác nhận' }), true);
});

test('reads window times from text or Date cells; bad rows are ignored', () => {
  assert.deepEqual(plain(gs.parseHm('9:05')), { hours: 9, minutes: 5 });
  assert.deepEqual(plain(gs.parseHm('20h30')), { hours: 20, minutes: 30 });
  assert.deepEqual(plain(gs.parseHm(new Date(1899, 11, 30, 14, 15))), { hours: 14, minutes: 15 });
  assert.equal(gs.parseHm('25:00'), null);
  assert.equal(gs.parseHm(''), null);
  const slots = gs.generateSlots([{ weekday: 'T7', start: 'sáng', end: '12:00', active: true }], [], config, NOW);
  assert.equal(slots.length, 0);
});

test('slot key round-trips and the booking code comes from the slot', () => {
  const start = gs.parseSlotKey('2026-11-15 09:30');
  assert.equal(gs.slotKey(start), '2026-11-15 09:30');
  assert.equal(gs.buildBookingCode(start), 'MO1511-0930');
  assert.equal(gs.parseSlotKey('2026-11-15T09:30'), null);
  assert.equal(gs.formatSlotLabel(start, gs.addMinutes(start, 45)), 'Chủ nhật 15/11 · 09:30–10:15');
});

test('groupSlotsByDay exposes only keys and labels', () => {
  const days = gs.groupSlotsByDay(gs.generateSlots(windows, [], config, NOW));
  assert.equal(days[0].date, '2026-11-14');
  assert.equal(days[0].label, 'Thứ 7 14/11');
  assert.deepEqual(plain(days[0].slots[0]), { key: '2026-11-14 09:00', label: '09:00–09:45' });
  assert.deepEqual(Object.keys(days[0]), ['date', 'label', 'slots']);
});

test('settings fall back to defaults; buffer may be zero', () => {
  assert.deepEqual(plain(gs.slotSettings({})), { slotMinutes: 45, bufferMinutes: 15, leadDays: 1, horizonDays: 14 });
  assert.equal(gs.slotSettings({ buffer_minutes: 0 }).bufferMinutes, 0);
  assert.equal(gs.slotSettings({ slot_minutes: 'abc' }).slotMinutes, 45);
});
