import { SITE_CONFIG } from './site-config.js';
import { t, localizeSlotLabel } from './ui-text.js';

// Generous: a cold Apps Script start + lock wait + Drive upload can take 20 s+.
const TIMEOUT_MS = 60000;
const NETWORK_ERROR = t('Mạng chập chờn hoặc hệ thống đang bận. Bạn thử lại sau ít phút nhé.');

async function callApi(options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(SITE_CONFIG.apiUrl, { ...options, signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const isApiConfigured = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(SITE_CONFIG.apiUrl);

/** { open, price, days } or null when the API is unset/unreachable. */
export async function fetchSlots() {
  if (!isApiConfigured()) return null;
  try {
    const data = await callApi();
    if (!data || !data.ok) return null;
    (data.days || []).forEach((day) => { day.label = localizeSlotLabel(day.label); });
    return data;
  } catch (error) {
    console.warn('Không tải được lịch trống', error);
    return null;
  }
}

/**
 * POST as text/plain (fetch's default for a string body) so the browser sends a
 * "simple" request without a CORS preflight, which Apps Script cannot answer.
 */
async function postJson(payload) {
  try {
    const data = await callApi({ method: 'POST', body: JSON.stringify(payload) });
    if (!data || typeof data.ok !== 'boolean') return { ok: false, error: NETWORK_ERROR };
    // One place to localize what the server says: error text and the slot label.
    if (data.error) data.error = t(data.error);
    if (data.slotLabel) data.slotLabel = localizeSlotLabel(data.slotLabel);
    return data;
  } catch (error) {
    console.warn('Gửi lỗi', error);
    return { ok: false, error: NETWORK_ERROR };
  }
}

export const requestQuote = (payload) => postJson({ ...payload, action: 'quote' });
export const submitBooking = (payload) => postJson({ ...payload, action: 'book' });
