/**
 * HtmlService page behind the digest links (?action=confirm|cancel&id=CODE&t=TOKEN).
 * Step 1 shows the booking and one button inside a plain GET form (adds go=1).
 * Step 2 (go=1) applies the action. No google.script.run and no inline script, so the page
 * exposes no server functions and reflects no untrusted text outside escapeHtml().
 */
function renderActionPage_(params) {
  var action = String(params.action || '');
  var code = cleanText(params.id, 20);
  var token = cleanText(params.t, 80);
  var confirmed = String(params.go || '') === '1';
  var body;

  if (confirmed) {
    var result = applyBookingAction_(action, code, token);
    body = '<p class="msg ' + (result.ok ? 'good' : 'bad-msg') + '">' + escapeHtml(result.message) + '</p>';
  } else {
    var booking = code ? findBookingByCode_(code) : null;
    var valid = booking && token && booking.token === token && (action === 'confirm' || action === 'cancel');
    if (!valid) {
      body = '<p class="msg">Link không hợp lệ hoặc đã hết hiệu lực.</p>';
    } else if (booking.status !== STATUS_PENDING) {
      body = '<p class="msg">Lịch ' + escapeHtml(booking.code) + ' đã được xử lý rồi (' + escapeHtml(booking.status) + ').</p>';
    } else {
      var isConfirm = action === 'confirm';
      body =
        '<p class="slot">' + escapeHtml(booking.slotLabel) + '</p>' +
        '<p>' + escapeHtml(booking.name) + ' · ' + escapeHtml(booking.email) + '</p>' +
        '<p class="purpose">' + escapeHtml(booking.purpose) + '</p>' +
        '<p><a href="' + escapeHtml(booking.billUrl) + '" target="_blank" rel="noopener">🧾 Xem ảnh chuyển khoản</a></p>' +
        '<form method="get" action="' + escapeHtml(apiUrl_()) + '" target="_top">' +
        '<input type="hidden" name="action" value="' + escapeHtml(action) + '">' +
        '<input type="hidden" name="id" value="' + escapeHtml(booking.code) + '">' +
        '<input type="hidden" name="t" value="' + escapeHtml(booking.token) + '">' +
        '<input type="hidden" name="go" value="1">' +
        '<button type="submit" class="' + (isConfirm ? 'ok' : 'bad') + '">' +
        (isConfirm ? '✅ Xác nhận lịch này' : '❌ Huỷ lịch này (bill không hợp lệ)') + '</button></form>';
    }
  }
  return HtmlService.createHtmlOutput(actionPageHtml_(body))
    .setTitle('Book Mo · ' + (code || 'lịch'))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function actionPageHtml_(body) {
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>' +
    'body{font:16px/1.5 -apple-system,Segoe UI,sans-serif;max-width:480px;margin:32px auto;padding:0 16px;color:#222}' +
    '.slot{font-size:20px;font-weight:700;margin:0 0 4px}.purpose{white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:10px}' +
    'button{width:100%;padding:14px;border-radius:12px;border:0;font-size:17px;font-weight:600;cursor:pointer}' +
    '.ok{background:#2a6f3f;color:#fff}.bad{background:#fff;color:#b00;border:2px solid #b00}' +
    '.msg{font-weight:600;margin-top:16px}.good{color:#2a6f3f}.bad-msg{color:#b00}' +
    '</style></head><body><h1 style="font-size:18px;margin:0 0 16px">Book Mo</h1>' + body + '</body></html>';
}
