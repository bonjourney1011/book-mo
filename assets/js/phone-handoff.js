/**
 * "Continue on your phone": the computer shows a QR code holding the booking draft
 * (slot, name, email, purpose) after a # so it never reaches the web server.
 * The phone opens the page, asks the API for a fresh quote and lands on the upload step.
 * Bank details are never put in the link: a crafted link must not be able to show another account.
 */
const HASH_PREFIX = '#tiep=';
// Resolved from this module, so it works from /book-mo/ and /book-mo/en/ alike.
const QR_SCRIPT = new URL('../vendor/qrcode-generator-1.4.4.js', import.meta.url).href;
const TEXT_LIMITS = { k: 16, n: 80, e: 120, p: 600, c: 20, r: 64 };
// Past this the QR gets too dense to read off a monitor; the purpose is dropped and retyped on the phone.
const MAX_URL_CHARS = 1400;

function toBase64Url(text) {
  let binary = '';
  new TextEncoder().encode(text).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/** draft = { k: slotKey, n, e, p, c: paidCode, r: requestId, f: fillMs }; ?src= rides along in the query. */
export function handoffUrl(draft) {
  const build = (d) => `${location.origin}${location.pathname}${location.search}${HASH_PREFIX}${toBase64Url(JSON.stringify(d))}`;
  const url = build(draft);
  return url.length <= MAX_URL_CHARS ? url : build({ ...draft, p: '' });
}

/** Reads and removes a draft from the address bar. Returns null when absent or malformed. */
export function takeHandoffDraft() {
  if (!location.hash.startsWith(HASH_PREFIX)) return null;
  const raw = location.hash.slice(HASH_PREFIX.length);
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    const draft = { f: Math.max(0, Math.min(Number(parsed.f) || 0, 86400000)) };
    for (const [key, max] of Object.entries(TEXT_LIMITS)) {
      draft[key] = typeof parsed[key] === 'string' ? parsed[key].slice(0, max) : '';
    }
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(draft.k) && draft.n && draft.e ? draft : null;
  } catch {
    return null;
  }
}

let qrLibrary;
function loadQrLibrary() {
  qrLibrary ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = QR_SCRIPT;
    script.onload = () => (globalThis.qrcode ? resolve(globalThis.qrcode) : reject(new Error('qr')));
    script.onerror = () => { qrLibrary = null; reject(new Error('qr')); };
    document.head.append(script);
  });
  return qrLibrary;
}

/**
 * Draws the QR into img at 4–5 screen pixels per module, sharp enough for a phone to read off a monitor.
 * A long purpose (up to 600 chars) makes a denser code, so it gets bigger modules.
 */
export async function drawHandoffQr(img, url) {
  const qrcode = await loadQrLibrary();
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  const cell = url.length > 700 ? 5 : 4;
  img.removeAttribute('src');
  img.src = qr.createDataURL(cell, cell * 4);
}
