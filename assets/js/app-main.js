import { t } from './ui-text.js';
import { SITE_CONFIG, messengerUrl } from './site-config.js';
import { isApiConfigured } from './booking-api-client.js';
import { initBookingFlow } from './booking-form-controller.js';
import { initLandingMotion } from './landing-motion.js';

// Where the visitor came from (?src=fb / ?src=zalo ...), stored with the booking.
const source = (new URLSearchParams(location.search).get('src') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30);

document.querySelectorAll('[data-portfolio-link]').forEach((link) => { link.href = SITE_CONFIG.portfolioUrl; });
document.querySelectorAll('[data-beauty-link]').forEach((link) => {
  if (SITE_CONFIG.beautyUrl) link.href = SITE_CONFIG.beautyUrl; else link.hidden = true;
});
const messenger = messengerUrl();
document.querySelectorAll('[data-messenger-link]').forEach((link) => {
  if (messenger) link.href = messenger; else link.hidden = true;
});

const booking = document.querySelector('[data-booking]');
initLandingMotion(booking);
if (isApiConfigured()) {
  initBookingFlow({ root: booking, source });
} else {
  booking.querySelector('[data-slots-status]').textContent = t('Trang đặt lịch chưa mở. Bạn nhắn Mo qua Messenger nhé.');
  booking.querySelectorAll('[data-step]').forEach((step, index) => { step.hidden = index !== 0; });
}
