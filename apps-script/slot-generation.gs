/**
 * Pure slot logic (no Google services, tested in Node).
 * Slots = fixed weekly windows from the Slots tab, stepped by slot + buffer minutes,
 * limited to [now + lead_days, now + horizon_days], minus slots with an active booking.
 * All dates are in the script time zone (Asia/Ho_Chi_Minh); keys are "yyyy-MM-dd HH:mm".
 */
var DEFAULT_SLOT_SETTINGS = { slotMinutes: 45, bufferMinutes: 15, leadDays: 1, horizonDays: 14 };
// Both spellings, since the owner may type the status by hand.
var CANCELLED_STATUSES = ['Huỷ', 'Hủy'];

function slotSettings(config) {
  var num = function (value, fallback) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    slotMinutes: num(config.slot_minutes, DEFAULT_SLOT_SETTINGS.slotMinutes),
    bufferMinutes: config.buffer_minutes === 0 || config.buffer_minutes === '0' ? 0 : num(config.buffer_minutes, DEFAULT_SLOT_SETTINGS.bufferMinutes),
    leadDays: num(config.lead_days, DEFAULT_SLOT_SETTINGS.leadDays),
    horizonDays: num(config.horizon_days, DEFAULT_SLOT_SETTINGS.horizonDays)
  };
}

function isBookingOpen(config) {
  return config.booking_open === true;
}

/** "09:30" text or a Date cell (Sheets may coerce typed times) -> { hours, minutes } or null. */
function parseHm(value) {
  if (value && typeof value.getTime === 'function' && !isNaN(value.getTime())) {
    return { hours: value.getHours(), minutes: value.getMinutes() };
  }
  var match = /^\s*(\d{1,2})[:h.](\d{2})\s*$/.exec(String(value == null ? '' : value));
  if (!match) return null;
  var hours = Number(match[1]);
  var minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? { hours: hours, minutes: minutes } : null;
}

function slotKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2) +
    ' ' + pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2);
}

/** Inverse of slotKey; null if malformed. */
function parseSlotKey(key) {
  var match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function dayAt(date, hours, minutes) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

function isActiveBooking(booking) {
  return CANCELLED_STATUSES.indexOf(String(booking.status || '').trim()) === -1;
}

/**
 * windows: [{ weekday: 'T7', start: '09:00', end: '12:00', active: true }]
 * bookings: [{ slotKey, status }]
 * Returns sorted [{ key, start, end }].
 */
function generateSlots(windows, bookings, config, now) {
  var settings = slotSettings(config);
  var earliest = addMinutes(now, settings.leadDays * 24 * 60).getTime();
  var latest = addMinutes(now, settings.horizonDays * 24 * 60).getTime();
  var taken = {};
  (bookings || []).filter(isActiveBooking).forEach(function (booking) { taken[booking.slotKey] = true; });
  var active = (windows || []).filter(function (w) { return w.active !== false; });
  var out = [];

  for (var dayOffset = 0; dayOffset <= settings.horizonDays + 1; dayOffset++) {
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    var code = WEEKDAY_CODES[day.getDay()];
    active.forEach(function (w) {
      if (String(w.weekday).trim().toUpperCase() !== code) return;
      var from = parseHm(w.start);
      var to = parseHm(w.end);
      if (!from || !to) return;
      var t = dayAt(day, from.hours, from.minutes);
      var windowEnd = dayAt(day, to.hours, to.minutes).getTime();
      while (addMinutes(t, settings.slotMinutes).getTime() <= windowEnd) {
        var ms = t.getTime();
        if (ms >= earliest && ms <= latest && !taken[slotKey(t)]) {
          out.push({ key: slotKey(t), start: t, end: addMinutes(t, settings.slotMinutes) });
        }
        t = addMinutes(t, settings.slotMinutes + settings.bufferMinutes);
      }
    });
  }
  out.sort(function (a, b) { return a.start.getTime() - b.start.getTime(); });
  return out;
}

/** Public shape for the page: no names, no emails, no bank data. */
function groupSlotsByDay(slots) {
  var days = [];
  var byDate = {};
  slots.forEach(function (slot) {
    var date = slot.key.slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = { date: date, label: formatDayLabel(slot.start), slots: [] };
      days.push(byDate[date]);
    }
    byDate[date].slots.push({ key: slot.key, label: formatHm(slot.start) + '–' + formatHm(slot.end) });
  });
  return days;
}
