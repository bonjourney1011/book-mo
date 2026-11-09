/**
 * "Book Mo" menu in the Sheet + the 08:00 digest: one email a day listing every booking still
 * "Chờ duyệt", each with its bill link and two action links (confirm / cancel).
 * Emails go to the deploying Google account; set Script Property NOTIFY_EMAIL to send elsewhere.
 */
var DIGEST_HANDLER = 'sendPendingDigest';
var STALE_AFTER_HOURS = 48;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Book Mo')
    .addItem('⏰ Bật email tổng hợp 8h sáng', 'installDailyTrigger')
    .addItem('📨 Gửi email tổng hợp ngay', 'sendPendingDigestWithToast')
    .addItem('📅 Test lịch + email (cấp quyền lần đầu)', 'testCalendarAndEmail')
    .addToUi();
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === DIGEST_HANDLER) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(DIGEST_HANDLER).timeBased().everyDays(1).atHour(8).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã bật: mỗi sáng 8h gửi 1 email nếu có lịch chờ duyệt.', 'Book Mo', 6);
}

function sendPendingDigestWithToast() {
  var count = sendPendingDigest();
  SpreadsheetApp.getActiveSpreadsheet().toast(count ? 'Đã gửi email với ' + count + ' lịch chờ duyệt.' : 'Không có lịch chờ duyệt, không gửi email.', 'Book Mo', 6);
}

function notifyAddress_() {
  return PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
}

/** Returns the number of pending bookings emailed (0 = no email sent). */
function sendPendingDigest() {
  var pending = readBookings_().filter(function (b) { return b.status === STATUS_PENDING; });
  if (!pending.length) return 0;
  var config = readConfig_();
  var execUrl = apiUrl_(config);
  try {
    MailApp.sendEmail({
      to: notifyAddress_(),
      subject: '📅 Book Mo: ' + pending.length + ' lịch chờ duyệt',
      htmlBody: buildDigestHtml_(pending, execUrl, config),
      body: pending.map(function (b) { return b.code + ' · ' + b.slotLabel + ' · ' + b.name; }).join('\n')
    });
  } catch (err) {
    console.error('Digest email failed', err);
    return 0;
  }
  return pending.length;
}

function actionLink_(execUrl, action, booking) {
  return execUrl + '?action=' + action + '&id=' + encodeURIComponent(booking.code) + '&t=' + encodeURIComponent(booking.token);
}

function digestWarnings_(booking, now) {
  var warnings = [];
  if (booking.paidCode && booking.paidCode !== booking.code) warnings.push('Nội dung CK ghi ' + booking.paidCode + ', khác mã lịch.');
  if (!booking.eventId) warnings.push('Chưa có event Calendar (bấm Xác nhận sẽ tạo lại).');
  var created = booking.createdAt && typeof booking.createdAt.getTime === 'function' ? booking.createdAt.getTime() : 0;
  if (created && now - created > STALE_AFTER_HOURS * 3600000) warnings.push('Đã chờ hơn ' + STALE_AFTER_HOURS + ' giờ.');
  return warnings;
}

function buildDigestHtml_(pending, execUrl, config) {
  var now = Date.now();
  var btn = 'display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px';
  var cards = pending.map(function (b) {
    var warnings = digestWarnings_(b, now).map(function (w) { return '<li>' + escapeHtml(w) + '</li>'; }).join('');
    return '<div style="border:1px solid #ddd;border-radius:12px;padding:16px;margin:0 0 16px">' +
      '<p style="margin:0 0 6px;font-size:17px"><b>' + escapeHtml(b.slotLabel) + '</b> · ' + escapeHtml(b.code) + '</p>' +
      '<p style="margin:0 0 6px">' + escapeHtml(b.name) + ' · ' + escapeHtml(b.email) + '</p>' +
      '<p style="margin:0 0 10px;white-space:pre-wrap;color:#333">' + escapeHtml(b.purpose) + '</p>' +
      (warnings ? '<ul style="margin:0 0 10px;padding-left:18px;color:#b00">' + warnings + '</ul>' : '') +
      '<p style="margin:0 0 12px"><a href="' + escapeHtml(b.billUrl) + '">🧾 Xem ảnh chuyển khoản</a></p>' +
      '<p style="margin:0">' +
      '<a style="' + btn + ';background:#2a6f3f;color:#fff" href="' + escapeHtml(actionLink_(execUrl, 'confirm', b)) + '">✅ Xác nhận</a>' +
      '<a style="' + btn + ';background:#fff;color:#b00;border:1px solid #b00" href="' + escapeHtml(actionLink_(execUrl, 'cancel', b)) + '">❌ Huỷ (bill không hợp lệ)</a>' +
      '</p></div>';
  }).join('');
  return '<div style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;max-width:560px">' +
    '<p>Có <b>' + pending.length + '</b> lịch chờ duyệt. Mỗi link chỉ dùng được một lần.</p>' + cards +
    (config.site_url ? '<p style="color:#666">Trang: ' + escapeHtml(config.site_url) + '</p>' : '') + '</div>';
}

/** Config api_url (the /exec URL) when filled, else the URL of the deployment serving this call. */
function apiUrl_(config) {
  var fromConfig = String((config || readConfig_()).api_url || '').trim();
  return fromConfig || ScriptApp.getService().getUrl();
}

/**
 * Called from the action page (go=1). Only a pending booking with a matching token changes state,
 * so a link cannot be replayed and a wrong token does nothing.
 */
function applyBookingAction_(action, code, token) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, message: 'Hệ thống đang bận, thử lại sau ít phút.' };
  try {
    var booking = findBookingByCode_(code);
    if (!booking || !token || booking.token !== token || !/^[a-f0-9]{40}$/.test(token)) return { ok: false, message: 'Link không hợp lệ.' };
    if (booking.status !== STATUS_PENDING) return { ok: false, message: 'Lịch này đã được xử lý rồi (' + booking.status + ').' };
    var config = readConfig_();
    if (action === 'confirm') {
      var eventId = booking.eventId || createBookingEvent_(booking, config);
      updateBookingRow_(booking.rowIndex, { status: STATUS_CONFIRMED, event_id: eventId });
      booking.status = STATUS_CONFIRMED;
      emailBooker_('confirmed', booking, config);
      return { ok: true, message: 'Đã xác nhận lịch ' + booking.code + '. Khách đã nhận email.' };
    }
    if (action === 'cancel') {
      updateBookingRow_(booking.rowIndex, { status: STATUS_CANCELLED });
      deleteBookingEvent_(booking.eventId);
      emailBooker_('cancelled', booking, config);
      CacheService.getScriptCache().remove(PUBLIC_SLOTS_CACHE_KEY);
      return { ok: true, message: 'Đã huỷ lịch ' + booking.code + '. Khung giờ mở lại, khách đã nhận email.' };
    }
    return { ok: false, message: 'Hành động không hợp lệ.' };
  } finally {
    lock.releaseLock();
  }
}
