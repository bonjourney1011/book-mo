import { t } from './ui-text.js';
import { el } from './dom-and-format-helpers.js';

/**
 * Day tabs + time chips. days = [{ date, label, slots: [{ key, label }] }] from the API.
 * onSelect({ key, label }) fires when a chip is chosen; label = "Thứ 7 15/11 · 09:30–10:15".
 */
export function renderSlotPicker(container, days, onSelect) {
  if (!days.length) {
    container.replaceChildren(el('p', { class: 'slots__empty', text: t('Hai tuần tới Mo chưa có khung trống. Bạn ghé lại sau nhé.') }));
    return;
  }
  let activeDay = days[0];
  let selectedKey = '';
  const tabs = el('div', { class: 'day-tabs', role: 'group', 'aria-label': t('Chọn ngày') });
  const chips = el('div', { class: 'slot-chips', role: 'group', 'aria-label': t('Chọn giờ') });

  const renderChips = () => {
    chips.replaceChildren(...activeDay.slots.map((slot) => {
      const chip = el('button', {
        type: 'button', class: 'chip', text: slot.label,
        'aria-pressed': slot.key === selectedKey ? 'true' : 'false'
      });
      chip.addEventListener('click', () => {
        selectedKey = slot.key;
        renderChips();
        onSelect({ key: slot.key, label: `${activeDay.label} · ${slot.label}` });
      });
      return chip;
    }));
  };
  const renderTabs = () => {
    tabs.replaceChildren(...days.map((day) => {
      // "Thứ 7 15/11" / "Chủ nhật 15/11": last word is the date
      const words = day.label.split(' ');
      const date = words.pop();
      const weekday = words.join(' ');
      const tab = el('button', {
        type: 'button', class: 'day-tab',
        'aria-pressed': day === activeDay ? 'true' : 'false'
      }, el('span', { class: 'day-tab__weekday', text: weekday }), el('span', { class: 'day-tab__date', text: date }),
        el('span', { class: 'day-tab__count', text: t('{n} khung', { n: day.slots.length }) }));
      tab.addEventListener('click', () => { activeDay = day; renderTabs(); renderChips(); });
      return tab;
    }));
  };
  renderTabs();
  renderChips();
  container.replaceChildren(tabs, chips);
}
