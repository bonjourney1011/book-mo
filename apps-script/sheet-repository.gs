/** Reads and writes the Config / Slots / Bookings tabs of the bound spreadsheet. */
var SHEET_NAMES = { config: 'Config', slots: 'Slots', bookings: 'Bookings' };
var SLOT_HEADERS = ['weekday', 'start', 'end', 'active'];
var BOOKING_HEADERS = [
  'created_at', 'booking_code', 'slot_start', 'slot_end', 'slot_label', 'name', 'email', 'purpose',
  'bill_url', 'bill_file_id', 'paid_code', 'status', 'action_token', 'event_id', 'source', 'updated_at'
];
var BOOKING_STATUSES = ['Chờ duyệt', 'Đã xác nhận', 'Huỷ'];
var STATUS_PENDING = BOOKING_STATUSES[0];
var STATUS_CONFIRMED = BOOKING_STATUSES[1];
var STATUS_CANCELLED = BOOKING_STATUSES[2];

function getSheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Thiếu tab "' + name + '". Chạy setupSheets() trước.');
  return sheet;
}

/** Always reads `width` columns, so a tab missing trailing columns yields '' instead of undefined. */
function readRows_(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, width || sheet.getLastColumn()).getValues();
}

function cell_(value) {
  return value == null ? '' : String(value);
}

function bookingCol_(header) {
  return BOOKING_HEADERS.indexOf(header);
}

/** Config tab: column A = key, column B = value. */
function readConfig_() {
  var config = {};
  readRows_(getSheet_(SHEET_NAMES.config)).forEach(function (row) {
    var key = String(row[0]).trim();
    if (key) config[key] = row[1];
  });
  return config;
}

/** Slots tab -> [{ weekday, start, end, active }]; start/end may be text or Date cells. */
function readSlotWindows_() {
  return readRows_(getSheet_(SHEET_NAMES.slots), SLOT_HEADERS.length)
    .filter(function (row) { return String(row[0]).trim(); })
    .map(function (row) {
      return { weekday: String(row[0]).trim().toUpperCase(), start: row[1], end: row[2], active: row[3] === true };
    });
}

function rowToBooking_(row, rowIndex) {
  var slotStart = row[bookingCol_('slot_start')];
  var slotEnd = row[bookingCol_('slot_end')];
  var hasDates = slotStart && typeof slotStart.getTime === 'function';
  return {
    rowIndex: rowIndex,
    createdAt: row[bookingCol_('created_at')],
    code: cell_(row[bookingCol_('booking_code')]).trim(),
    slotStart: hasDates ? slotStart : null,
    slotEnd: slotEnd && typeof slotEnd.getTime === 'function' ? slotEnd : null,
    slotKey: hasDates ? slotKey(slotStart) : '',
    slotLabel: cell_(row[bookingCol_('slot_label')]),
    name: cell_(row[bookingCol_('name')]),
    email: cell_(row[bookingCol_('email')]).trim(),
    purpose: cell_(row[bookingCol_('purpose')]),
    billUrl: cell_(row[bookingCol_('bill_url')]),
    paidCode: cell_(row[bookingCol_('paid_code')]).trim(),
    status: cell_(row[bookingCol_('status')]).trim(),
    token: cell_(row[bookingCol_('action_token')]).trim(),
    eventId: cell_(row[bookingCol_('event_id')]).trim(),
    source: cell_(row[bookingCol_('source')])
  };
}

/** All bookings with their 1-based sheet row index (header is row 1). */
function readBookings_() {
  return readRows_(getSheet_(SHEET_NAMES.bookings), BOOKING_HEADERS.length)
    .map(function (row, index) { return rowToBooking_(row, index + 2); })
    .filter(function (booking) { return booking.code; });
}

function countActiveBookingsByEmail_(bookings, email) {
  return bookings.filter(function (b) { return isActiveBooking(b) && b.email.toLowerCase() === email; }).length;
}

function findBookingByCode_(code) {
  var wanted = String(code || '').trim();
  var found = null;
  readBookings_().forEach(function (booking) {
    if (booking.code === wanted && (!found || isActiveBooking(booking))) found = booking;
  });
  return found;
}

/**
 * Columns are written by position: add new columns only at the end of the Bookings tab.
 * Text cells go through sanitizeCell so pasted "=..." never becomes a formula.
 */
function appendBooking_(booking) {
  var values = {
    created_at: booking.createdAt,
    booking_code: booking.code,
    slot_start: booking.slot.start,
    slot_end: booking.slot.end,
    slot_label: booking.slotLabel,
    name: booking.name,
    email: booking.email,
    purpose: booking.purpose,
    bill_url: booking.billUrl,
    bill_file_id: booking.billFileId,
    paid_code: booking.paidCode,
    status: STATUS_PENDING,
    action_token: booking.token,
    event_id: '',
    source: booking.source,
    updated_at: booking.createdAt
  };
  getSheet_(SHEET_NAMES.bookings).appendRow(BOOKING_HEADERS.map(function (header) { return sanitizeCell(values[header]); }));
}

/** patch = { status?, event_id? }; always stamps updated_at. */
function updateBookingRow_(rowIndex, patch) {
  var sheet = getSheet_(SHEET_NAMES.bookings);
  patch.updated_at = new Date();
  Object.keys(patch).forEach(function (header) {
    var col = bookingCol_(header);
    if (col !== -1) sheet.getRange(rowIndex, col + 1).setValue(sanitizeCell(patch[header]));
  });
}
