import { t } from './ui-text.js';
import { fetchSlots } from './booking-api-client.js';
import { renderSlotPicker, isFree } from './slot-picker.js';

const REFRESH_EVERY_MS = 60000;

/**
 * Step 1: loads the week calendar and keeps it fresh while the visitor is choosing, so a slot someone else
 * just booked or is holding turns grey within about a minute and a half (the server caches the list 30 s).
 * Refreshes every 60 s while step 1 shows and the tab is visible, and as soon as the tab comes back.
 * A quiet refresh only redraws the calendar: the status line, the shown week and the chosen slot stay.
 */
export function createSlotStep({ root, statusBox, listBox, isActive, onPick }) {
  const view = {};
  let lastTry = 0;
  let latest = 0;
  let inFlight = false;

  async function load(message, { quiet = false } = {}) {
    if (quiet && inFlight) return;
    const mine = ++latest;
    inFlight = true;
    lastTry = Date.now();
    if (!quiet) {
      statusBox.textContent = message || t('Đang tải khung giờ trống…');
      listBox.replaceChildren();
    }
    const data = await fetchSlots();
    if (mine !== latest) return; // a newer load started meanwhile
    inFlight = false;
    // The landing hero shows the nearest free slot from the same response (no second request).
    root.dispatchEvent(new CustomEvent('slots-loaded', { detail: data }));
    if (!data) { if (!quiet) statusBox.textContent = t('Chưa tải được lịch. Bạn tải lại trang hoặc nhắn Mo nhé.'); return; }
    if (!data.open) { statusBox.textContent = t('Mo đang tạm đóng lịch. Bạn ghé lại sau nhé.'); listBox.replaceChildren(); return; }
    const anyFree = data.days.some((day) => day.slots.some(isFree));
    // A quiet refresh keeps the current line, unless the calendar just filled up or freed up again.
    if (!quiet || !anyFree || statusBox.dataset.full) {
      statusBox.textContent = !anyFree ? t('Hai tuần tới Mo đã kín lịch. Bạn ghé lại sau nhé.')
        : message || t('Mỗi buổi {n} phút. Bạn chọn một ô còn trống trong lịch.', { n: data.slotMinutes });
    }
    statusBox.dataset.full = anyFree ? '' : '1';
    renderSlotPicker(listBox, data.days, onPick, view);
  }

  const refreshIfStale = (age) => {
    if (!document.hidden && isActive() && Date.now() - lastTry >= age) load(undefined, { quiet: true });
  };
  setInterval(() => refreshIfStale(REFRESH_EVERY_MS), 10000);
  document.addEventListener('visibilitychange', () => refreshIfStale(15000));

  /** The chosen slot was taken: forget it so the next draw shows no selection. */
  const forget = () => { view.selectedKey = ''; };
  return { load, forget };
}
