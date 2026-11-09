/**
 * Pure text/date helpers shared by the other .gs files (no Google services, tested in Node).
 */
var WEEKDAY_CODES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
var WEEKDAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanText(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Keeps line breaks (purpose textarea) but strips other control characters. */
function cleanMultiline(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/** Blocks formula injection: Sheets would evaluate text starting with = + - @. */
function sanitizeCell(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value && typeof value.getTime === 'function') return value;
  var text = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function pad(number, width) {
  var text = String(number);
  while (text.length < width) text = '0' + text;
  return text;
}

/** 100000 -> "100.000"; avoids Intl, whose locale support in Apps Script is patchy. */
function formatVnd(amount) {
  return String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || ''));
}

/** ASCII-only transfer note derived from the slot, e.g. MO1511-0930. One active booking per slot keeps it unique. */
function buildBookingCode(slotStart) {
  return 'MO' + pad(slotStart.getDate(), 2) + pad(slotStart.getMonth() + 1, 2) +
    '-' + pad(slotStart.getHours(), 2) + pad(slotStart.getMinutes(), 2);
}

function formatHm(date) {
  return pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2);
}

/** "Thứ 7 15/11" */
function formatDayLabel(date) {
  return WEEKDAY_NAMES[date.getDay()] + ' ' + pad(date.getDate(), 2) + '/' + pad(date.getMonth() + 1, 2);
}

/** "Thứ 7 15/11 · 09:30–10:15" */
function formatSlotLabel(start, end) {
  return formatDayLabel(start) + ' · ' + formatHm(start) + '–' + formatHm(end);
}

/** Null when the owner has not filled the bank rows yet. Amount is always the Config price. */
function buildPaymentInfo(config, bookingCode) {
  var bankBin = String(config.bank_bin || '').trim();
  var account = String(config.bank_account || '').trim();
  if (!bankBin || !account) return null;
  return {
    bankBin: bankBin,
    account: account,
    accountName: cleanText(config.bank_account_name, 60),
    amount: Number(config.price) || 100000,
    addInfo: bookingCode
  };
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
