import { handoffUrl, drawHandoffQr } from './phone-handoff.js';
import { fetchBookingStatus } from './booking-api-client.js';
import { t } from './ui-text.js';

const POLL_EVERY_MS = 6000;
const POLL_FOR_MS = 10 * 60 * 1000;

/**
 * Desktop panel "Ảnh chuyển khoản đang nằm trên điện thoại?": draws the QR when opened, then asks the
 * server every 6 s whether the phone already sent this booking (same requestId), so the computer moves
 * to the done step by itself. Asks only while the tab is visible, the panel is open and step 4 shows;
 * never two requests at once; gives up after 10 minutes. Returns stop() for when step 4 is left.
 */
export function attachPhoneHandoff({ panel, qrImage, textBox, getDraft, isOnUploadStep, onBooked }) {
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };

  function watch(requestId) {
    stop();
    const startedAt = Date.now();
    let busy = false;
    const id = setInterval(async () => {
      if (timer !== id) return;
      if (Date.now() - startedAt > POLL_FOR_MS) { stop(); return; }
      if (busy || document.hidden || !panel.open || !isOnUploadStep()) return;
      busy = true;
      const status = await fetchBookingStatus(requestId);
      busy = false;
      if (timer !== id) return; // stopped or restarted while the request was in flight
      if (status.ok && status.booked && status.booking) { stop(); onBooked(status.booking); }
    }, POLL_EVERY_MS);
    timer = id;
  }

  panel.hidden = false;
  panel.addEventListener('toggle', async () => {
    const draft = panel.open ? getDraft() : null;
    if (!draft) return;
    try {
      await drawHandoffQr(qrImage, handoffUrl(draft));
      watch(draft.r);
    } catch {
      textBox.textContent = t('Chưa tạo được mã QR. Bạn gửi ảnh qua Zalo hoặc Messenger cho chính mình, rồi dán vào đây bằng Ctrl+V nhé.');
    }
  });
  return stop;
}
