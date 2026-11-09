/**
 * Pure booking validation (no Google services, tested in Node).
 * ctx = { config, available (from generateSlots), now }. Errors are Vietnamese, shown as-is on the page.
 */
var TEXT_LIMITS = { name: 80, email: 120, purpose: 600, source: 30 };
var MIN_FILL_MS = 3000;
// ~2 MB of base64; the page resizes to <=1200px JPEG so a real bill is 150-400 KB.
var MAX_BILL_BASE64_CHARS = 2800000;
// base64 of the magic bytes: JPEG FF D8 FF, PNG 89 50 4E 47, WebP "RIFF"
var BILL_MAGIC = { 'image/jpeg': '/9j/', 'image/png': 'iVBORw0KGgo', 'image/webp': 'UklGR' };
var SLOT_TAKEN_MESSAGE = 'Khung giờ này vừa có người đặt. Bạn chọn khung khác giúp Mo nhé.';

function fail(error, extra) {
  var out = { ok: false, error: error };
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

function isSpamPayload(payload) {
  return Boolean(payload.website) || !(Number(payload.fillMs) >= MIN_FILL_MS);
}

function findAvailableSlot(available, key) {
  for (var i = 0; i < available.length; i++) {
    if (available[i].key === key) return available[i];
  }
  return null;
}

/** Step 3 (quote): enough to show the QR. Nothing is written. */
function validateQuote(payload, ctx) {
  if (!payload || typeof payload !== 'object') return fail('Dữ liệu không hợp lệ.');
  if (isSpamPayload(payload)) return fail('Không gửi được, bạn thử lại nhé.');
  if (!isBookingOpen(ctx.config)) return fail('Mo đang tạm đóng lịch. Bạn quay lại sau nhé.');

  var name = cleanText(payload.name, TEXT_LIMITS.name);
  var email = cleanText(payload.email, TEXT_LIMITS.email).toLowerCase();
  if (!name) return fail('Bạn điền tên để Mo biết gọi bạn là gì nhé.');
  if (!isValidEmail(email)) return fail('Email chưa đúng. Mo gửi lời mời lịch qua email này.');

  var key = cleanText(payload.slot, 16);
  if (!parseSlotKey(key)) return fail('Bạn chọn một khung giờ trước nhé.');
  var slot = findAvailableSlot(ctx.available || [], key);
  if (!slot) return fail(SLOT_TAKEN_MESSAGE, { slotTaken: true });

  return {
    ok: true,
    slot: slot,
    name: name,
    email: email,
    source: cleanText(payload.source, TEXT_LIMITS.source).replace(/[^a-z0-9_-]/gi, '')
  };
}

/** Step 5 (book): quote checks + purpose + bill image. */
function validateBooking(payload, ctx) {
  var quote = validateQuote(payload, ctx);
  if (!quote.ok) return quote;

  var purpose = cleanMultiline(payload.purpose, TEXT_LIMITS.purpose);
  if (purpose.length < 3) return fail('Bạn ghi vài dòng về điều muốn trao đổi, để Mo chuẩn bị trước nhé.');

  var billBase64 = typeof payload.billBase64 === 'string' ? payload.billBase64.replace(/^data:[^,]*,/, '') : '';
  if (!billBase64) return fail('Bạn gửi ảnh chụp màn hình chuyển khoản nhé.');
  if (billBase64.length > MAX_BILL_BASE64_CHARS) return fail('Ảnh quá lớn. Bạn chụp lại màn hình rồi chọn lại nhé.');
  billBase64 = billBase64.replace(/\s/g, '');
  if (billBase64.length < 200 || !/^[A-Za-z0-9+/=]+$/.test(billBase64.slice(0, 200))) return fail('Ảnh không đọc được, bạn chọn lại nhé.');
  var billMime = String(payload.billMime || 'image/jpeg').toLowerCase();
  if (!BILL_MAGIC[billMime]) return fail('Ảnh cần là JPG, PNG hoặc WebP.');
  if (billBase64.indexOf(BILL_MAGIC[billMime]) !== 0) return fail('Tệp này không phải ảnh JPG/PNG/WebP. Bạn chụp màn hình rồi chọn lại nhé.');

  var paidCode = cleanText(payload.paidCode, 20).toUpperCase().replace(/[^A-Z0-9-]/g, '');

  return {
    ok: true,
    slot: quote.slot,
    name: quote.name,
    email: quote.email,
    source: quote.source,
    purpose: purpose,
    billBase64: billBase64,
    billMime: billMime,
    paidCode: paidCode
  };
}

/** The page's random request id, reduced to [A-Za-z0-9_-] and 64 chars ('' when missing). */
function cleanRequestId(value) {
  return typeof value === 'string' ? value.replace(/[^\w-]/g, '').slice(0, 64) : '';
}

/**
 * action 'status': has this request id already booked? cachedJson = the replay cache entry
 * ('req_' + requestId) saved after a successful booking, or null. Read-only: lets the computer
 * notice that the phone (same request id, via the handoff QR) sent the booking.
 */
function bookingStatus(requestId, cachedJson) {
  if (!requestId) return fail('Dữ liệu không hợp lệ.');
  if (!cachedJson) return { ok: true, booked: false };
  try {
    var booking = JSON.parse(cachedJson);
    return booking && booking.ok ? { ok: true, booked: true, booking: booking } : { ok: true, booked: false };
  } catch (err) {
    return { ok: true, booked: false };
  }
}
