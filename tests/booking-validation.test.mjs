import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

process.env.TZ = 'Asia/Ho_Chi_Minh';

const gs = vm.createContext({});
for (const file of ['text-helpers.gs', 'slot-generation.gs', 'booking-validation.gs']) {
  vm.runInContext(readFileSync(new URL(`../apps-script/${file}`, import.meta.url), 'utf8'), gs);
}

const NOW = new Date(2026, 10, 12, 10, 0);
const windows = [{ weekday: 'T7', start: '09:00', end: '12:00', active: true }];
const config = { booking_open: true, price: 100000, bank_bin: '970436', bank_account: '0123456789', bank_account_name: 'VAN THI THUAN' };
const available = gs.generateSlots(windows, [], config, NOW);
const ctx = (overrides = {}) => ({ config, available, now: NOW, ...overrides });
// PNG magic bytes + padding: validation only looks at the prefix, not the pixels.
const bill = `iVBORw0KGgo${'A'.repeat(400)}`;
const jpeg = `/9j/${'A'.repeat(400)}`;

function payload(overrides = {}) {
  return {
    slot: '2026-11-14 10:00', name: '  Lan ', email: 'Lan@Example.com', purpose: 'Muốn hỏi về chuyển ngành sang data.',
    billBase64: bill, billMime: 'image/png', paidCode: 'mo1411-1000', website: '', fillMs: 12000, source: 'fb',
    ...overrides
  };
}

test('quote: accepts a free slot and normalises name/email', () => {
  const out = gs.validateQuote(payload(), ctx());
  assert.equal(out.ok, true);
  assert.equal(out.name, 'Lan');
  assert.equal(out.email, 'lan@example.com');
  assert.equal(out.slot.key, '2026-11-14 10:00');
  assert.equal(gs.buildBookingCode(out.slot.start), 'MO1411-1000');
});

test('quote: rejects spam, closed booking, bad email, unknown or taken slot', () => {
  assert.equal(gs.validateQuote(payload({ website: 'x' }), ctx()).ok, false);
  assert.equal(gs.validateQuote(payload({ fillMs: 500 }), ctx()).ok, false);
  assert.match(gs.validateQuote(payload(), ctx({ config: { ...config, booking_open: false } })).error, /tạm đóng/);
  assert.match(gs.validateQuote(payload({ email: 'lan@' }), ctx()).error, /Email/);
  assert.match(gs.validateQuote(payload({ slot: 'bogus' }), ctx()).error, /khung giờ/);
  const taken = gs.validateQuote(payload({ slot: '2026-11-14 10:30' }), ctx());
  assert.equal(taken.ok, false);
  assert.equal(taken.slotTaken, true);
});

test('book: requires purpose and a sane bill image', () => {
  const ok = gs.validateBooking(payload(), ctx());
  assert.equal(ok.ok, true);
  assert.equal(ok.paidCode, 'MO1411-1000');
  assert.equal(ok.billMime, 'image/png');
  assert.match(gs.validateBooking(payload({ purpose: 'ok' }), ctx()).error, /vài dòng/);
  assert.match(gs.validateBooking(payload({ billBase64: '' }), ctx()).error, /ảnh/);
  assert.match(gs.validateBooking(payload({ billBase64: 'a'.repeat(2800001) }), ctx()).error, /quá lớn/);
  assert.match(gs.validateBooking(payload({ billMime: 'image/gif' }), ctx()).error, /JPG/);
  assert.match(gs.validateBooking(payload({ billBase64: '<svg>' }), ctx()).error, /không đọc được/);
  assert.match(gs.validateBooking(payload({ billBase64: jpeg, billMime: 'image/png' }), ctx()).error, /không phải ảnh/);
  assert.equal(gs.validateBooking(payload({ billBase64: jpeg, billMime: 'image/jpeg' }), ctx()).ok, true);
  assert.match(gs.validateBooking(payload({ billBase64: `PHN2Zz${'A'.repeat(400)}`, billMime: 'image/jpeg' }), ctx()).error, /không phải ảnh/);
});

test('book: strips a data: prefix and keeps line breaks in purpose', () => {
  const out = gs.validateBooking(payload({ billBase64: `data:image/png;base64,${bill}`, purpose: 'Dòng 1\r\n\r\n\r\nDòng 2\t' }), ctx());
  assert.equal(out.billBase64, bill);
  assert.equal(out.purpose, 'Dòng 1\n\nDòng 2');
});

test('payment info uses the Config price and never leaks without bank rows', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(gs.buildPaymentInfo(config, "MO1411-1000"))), {
    bankBin: '970436', account: '0123456789', accountName: 'VAN THI THUAN', amount: 100000, addInfo: 'MO1411-1000'
  });
  assert.equal(gs.buildPaymentInfo({ price: 100000 }, 'X'), null);
});

test('sanitizeCell blocks formulas', () => {
  assert.equal(gs.sanitizeCell('=1+1'), "'=1+1");
  assert.equal(gs.sanitizeCell('@me'), "'@me");
  assert.equal(gs.sanitizeCell(12), 12);
});
