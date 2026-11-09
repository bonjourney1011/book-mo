import { EN_TEXT } from './ui-text-en.js';

/** Page language from <html lang>: the Vietnamese page is the source, /en/ is the translation. */
export const LANG = document.documentElement.lang === 'en' ? 'en' : 'vi';

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));

/**
 * t('Vietnamese text {n}', { n: 3 }). On the English page it returns the English entry; missing entries
 * fall back to the Vietnamese text so nothing ever shows blank.
 */
export function t(text, vars = {}) {
  if (LANG !== 'en' || typeof text !== 'string') return fill(String(text ?? ''), vars);
  if (EN_TEXT[text]) return fill(EN_TEXT[text], vars);
  // Server message with a number baked in ("Email này đã có 2 lịch…"): match it against the {n} template.
  for (const [key, english] of Object.entries(EN_TEXT)) {
    if (!key.includes('{n}')) continue;
    const pattern = new RegExp(`^${key.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&').replace('\\{n\\}', '(\\d+)')}$`);
    const found = text.match(pattern);
    if (found) return fill(english, { n: found[1] });
  }
  return text;
}

const WEEKDAYS_EN = { 'Chủ nhật': 'Sun', 'Thứ 2': 'Mon', 'Thứ 3': 'Tue', 'Thứ 4': 'Wed', 'Thứ 5': 'Thu', 'Thứ 6': 'Fri', 'Thứ 7': 'Sat' };

/** Server labels like "Thứ 7 15/11 · 09:30–10:15" → "Sat 15/11 · 09:30–10:15" on the English page. */
export const localizeSlotLabel = (label) =>
  LANG === 'en' ? String(label || '').replace(/Chủ nhật|Thứ [2-7]/g, (day) => WEEKDAYS_EN[day]) : label;
