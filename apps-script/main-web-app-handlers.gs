/**
 * Web app entry points. Deploy: Execute as "Me", Who has access "Anyone".
 * Every JSON path goes through respondJson_: an uncaught error would come back as an HTML page,
 * which the browser reports as a CORS failure.
 */
var GLOBAL_MAX_BOOKINGS = 30;
var MAX_ACTIVE_PER_EMAIL = 2;
var GLOBAL_WINDOW_SECONDS = 600;
var PUBLIC_SLOTS_CACHE_KEY = 'public_slots';
var PUBLIC_SLOTS_CACHE_SECONDS = 30;
var REQUEST_REPLAY_SECONDS = 21600;
var BUSY_MESSAGE = 'Hệ thống đang bận, bạn thử lại sau ít phút nhé.';

/** ?action=... -> owner action page; otherwise public slots JSON cached ~30 s. */
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action) return renderActionPage_(params);  // owner action page (HtmlService)
  return respondJson_(function () {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(PUBLIC_SLOTS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    var ctx = loadBookingContext_(new Date());
    var settings = slotSettings(ctx.config);
    var body = {
      ok: true,
      open: isBookingOpen(ctx.config),
      price: Number(ctx.config.price) || 100000,
      slotMinutes: settings.slotMinutes,
      leadDays: settings.leadDays,
      days: groupSlotsByDay(ctx.available)
    };
    cache.put(PUBLIC_SLOTS_CACHE_KEY, JSON.stringify(body), PUBLIC_SLOTS_CACHE_SECONDS);
    return body;
  });
}

function doPost(e) {
  return respondJson_(function () {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!payload || typeof payload !== 'object') return { ok: false, error: 'Dữ liệu không hợp lệ.' };
    var action = payload.action === 'book' ? 'book' : 'quote';
    var requestId = typeof payload.requestId === 'string' ? payload.requestId.replace(/[^\w-]/g, '').slice(0, 64) : '';
    var cache = CacheService.getScriptCache();

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { ok: false, error: BUSY_MESSAGE };
    var saved = null;
    var response;
    try {
      var replay = action === 'book' && requestId && cache.get('req_' + requestId);
      if (replay) return JSON.parse(replay);
      var ctx = loadBookingContext_(new Date());
      if (action === 'quote') return handleQuote_(payload, ctx);

      var recentCount = Number(cache.get('bookings_recent') || 0);
      if (recentCount >= GLOBAL_MAX_BOOKINGS) return { ok: false, error: BUSY_MESSAGE };
      var result = handleBook_(payload, ctx);
      if (!result.ok) return result;
      response = result.response;
      saved = result.booking;
      cache.put('bookings_recent', String(recentCount + 1), GLOBAL_WINDOW_SECONDS);
      if (requestId) cache.put('req_' + requestId, JSON.stringify(response), REQUEST_REPLAY_SECONDS);
      cache.remove(PUBLIC_SLOTS_CACHE_KEY);
    } finally {
      lock.releaseLock();
    }

    afterBookingSaved_(saved, ctx.config);
    return response;
  });
}

function loadBookingContext_(now) {
  var config = readConfig_();
  var bookings = readBookings_();
  return { config: config, bookings: bookings, available: generateSlots(readSlotWindows_(), bookings, config, now), now: now };
}

/** Step 3: validates slot + name + email and returns the transfer details. Writes nothing. */
function handleQuote_(payload, ctx) {
  var checked = validateQuote(payload, ctx);
  if (!checked.ok) return checked;
  var code = buildBookingCode(checked.slot.start);
  return {
    ok: true,
    bookingCode: code,
    slotLabel: formatSlotLabel(checked.slot.start, checked.slot.end),
    payment: buildPaymentInfo(ctx.config, code)
  };
}

/** Step 5: bill to Drive first (fail = nothing written), then the Sheet row. Runs inside the lock. */
function handleBook_(payload, ctx) {
  var checked = validateBooking(payload, ctx);
  if (!checked.ok) return checked;
  if (countActiveBookingsByEmail_(ctx.bookings, checked.email) >= MAX_ACTIVE_PER_EMAIL) {
    return { ok: false, error: 'Email này đã có ' + MAX_ACTIVE_PER_EMAIL + ' lịch đang chờ. Bạn reply email xác nhận nếu cần đổi.' };
  }
  var code = buildBookingCode(checked.slot.start);
  var bill;
  try {
    bill = saveBillImage_(checked.billBase64, checked.billMime, code);
  } catch (err) {
    console.error('Bill upload failed', err);
    return { ok: false, error: 'Không tải được ảnh, bạn thử lại nhé.' };
  }
  var booking = {
    createdAt: ctx.now,
    code: code,
    slot: checked.slot,
    slotStart: checked.slot.start,
    slotEnd: checked.slot.end,
    slotLabel: formatSlotLabel(checked.slot.start, checked.slot.end),
    name: checked.name,
    email: checked.email,
    purpose: checked.purpose,
    billUrl: bill.url,
    billFileId: bill.fileId,
    paidCode: checked.paidCode,
    token: newActionToken_(),
    source: checked.source
  };
  appendBooking_(booking);
  SpreadsheetApp.flush();
  return { ok: true, booking: booking, response: { ok: true, bookingCode: code, slotLabel: booking.slotLabel, email: booking.email } };
}

/** Outside the lock: Calendar invite + "received" email. Failures are logged, the row stays. */
function afterBookingSaved_(booking, config) {
  if (!booking) return;
  var eventId = createBookingEvent_(booking, config);
  if (eventId) {
    try {
      var saved = findBookingByCode_(booking.code);
      if (saved) updateBookingRow_(saved.rowIndex, { event_id: eventId });
    } catch (err) {
      console.error('Could not store event_id for ' + booking.code, err);
    }
  }
  emailBooker_('received', booking, config);
}

function newActionToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
}

function respondJson_(handler) {
  var body;
  try {
    body = handler();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    body = { ok: false, error: BUSY_MESSAGE };
  }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
