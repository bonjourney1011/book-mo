import { el } from './dom-and-format-helpers.js';
import { t, LANG } from './ui-text.js';

const WEEKDAYS = { vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

// Dates are "yyyy-mm-dd" strings in Vietnam time; UTC math keeps them stable in any visitor time zone.
const utc = (date) => new Date(`${date}T00:00:00Z`);
const plusDays = (date, n) => { const d = utc(date); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (date) => plusDays(date, -((utc(date).getUTCDay() + 6) % 7));
const ddmm = (date) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const todayInVietnam = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
export const isFree = (slot) => !slot.status || slot.status === 'free'; // no status = older server, all free

function weekHeader(view, weeks, dates, draw) {
  const index = weeks.indexOf(view.week);
  const nav = (step, label, symbol) => {
    const button = el('button', { type: 'button', class: 'cal__nav', 'aria-label': label, disabled: !weeks[index + step] }, symbol);
    button.addEventListener('click', () => { view.week = weeks[index + step]; draw(); });
    return button;
  };
  const month = new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(dates[3]));
  return el('div', { class: 'cal__head' },
    el('div', {},
      el('p', { class: 'cal__month', text: month.charAt(0).toUpperCase() + month.slice(1) }),
      el('p', { class: 'cal__range', text: `${ddmm(dates[0])} – ${ddmm(dates[6])}` })),
    el('div', { class: 'cal__navs' }, nav(-1, t('Tuần trước'), '‹'), nav(1, t('Tuần sau'), '›')));
}

function slotCell(day, slot, view, pick) {
  const [start, end] = slot.label.split('–');
  if (!isFree(slot)) {
    const why = slot.status === 'held' ? t('Đang giữ chỗ') : t('Đã có người đặt');
    return el('div', { class: `cal__slot cal__slot--taken${slot.status === 'held' ? ' cal__slot--held' : ''}`, 'data-key': slot.key, title: `${slot.label} · ${why}`, 'aria-label': `${day.label} ${slot.label}: ${why}` },
      el('span', { class: 'cal__time', text: start }), el('span', { class: 'cal__note', text: why }));
  }
  const button = el('button', {
    type: 'button', class: 'cal__slot', 'data-key': slot.key, 'aria-pressed': slot.key === view.selectedKey ? 'true' : 'false',
    'aria-label': `${day.label} ${slot.label}`
  }, el('span', { class: 'cal__time', text: start }), el('span', { class: 'cal__note', text: `– ${end}` }));
  button.addEventListener('click', () => pick(day, slot));
  return button;
}

/**
 * Week calendar in the spirit of Google Calendar's booking page: Monday–Sunday columns, one row per start
 * time used that week, free slots as buttons, booked or held slots greyed with diagonal hatching.
 * days = [{ date, label, slots: [{ key, label, status }] }] from the API.
 * view = { week, selectedKey } survives the 60-second refreshes, so the visitor never loses their place.
 */
export function renderSlotPicker(container, days, onSelect, view = {}) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const weeks = [...new Set(days.map((day) => mondayOf(day.date)))].sort();
  if (!weeks.length) {
    container.replaceChildren(el('p', { class: 'slots__empty', text: t('Hai tuần tới Mo chưa có khung trống. Bạn ghé lại sau nhé.') }));
    return;
  }
  const weekHasFree = (week) => [0, 1, 2, 3, 4, 5, 6].some((i) => byDate.get(plusDays(week, i))?.slots.some(isFree));
  if (!weeks.includes(view.week)) view.week = weeks.find(weekHasFree) || weeks[0];
  const today = todayInVietnam();

  const pick = (day, slot) => {
    view.selectedKey = slot.key;
    draw();
    onSelect({ key: slot.key, label: `${day.label} · ${slot.label}` });
  };

  function draw() {
    const dates = [0, 1, 2, 3, 4, 5, 6].map((i) => plusDays(view.week, i));
    const times = [...new Set(dates.flatMap((d) => (byDate.get(d)?.slots || []).map((s) => s.key.slice(11))))].sort();
    const cells = [el('div', { class: 'cal__corner' })];
    dates.forEach((date) => {
      const classes = ['cal__day', date === today ? 'is-today' : '', byDate.has(date) ? '' : 'is-off'].filter(Boolean).join(' ');
      cells.push(el('div', { class: classes },
        el('span', { class: 'cal__weekday', text: WEEKDAYS[LANG][utc(date).getUTCDay()] }),
        el('span', { class: 'cal__date', text: String(Number(date.slice(8, 10))) })));
    });
    times.forEach((time) => {
      cells.push(el('div', { class: 'cal__gutter', text: time }));
      dates.forEach((date) => {
        const day = byDate.get(date);
        const slot = day?.slots.find((s) => s.key.slice(11) === time);
        cells.push(el('div', { class: `cal__cell${date === today ? ' is-today' : ''}` }, slot ? slotCell(day, slot, view, pick) : null));
      });
    });
    const legend = el('p', { class: 'cal__legend' },
      el('span', { class: 'cal__key' }), t('Còn trống'),
      el('span', { class: 'cal__key cal__key--taken' }), t('Đã đặt hoặc đang giữ chỗ'),
      el('span', { class: 'cal__tz', text: t('Giờ Việt Nam (GMT+7)') }));
    const body = times.length
      ? el('div', { class: 'cal__grid' }, cells)
      : el('p', { class: 'cal__empty', text: t('Tuần này Mo không có lịch. Bạn bấm › để xem tuần sau.') });
    container.replaceChildren(el('div', { class: 'cal' }, weekHeader(view, weeks, dates, draw), body, legend));
  }
  draw();
}
