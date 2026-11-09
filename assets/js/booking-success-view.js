import { t } from './ui-text.js';
import { el } from './dom-and-format-helpers.js';
import { messengerUrl } from './site-config.js';

/** Step 5. result = { bookingCode, slotLabel, email } from the server. */
export function renderBookingSuccess(container, result) {
  const messenger = messengerUrl();
  const view = el('div', { class: 'done', tabindex: '-1' },
    el('p', { class: 'done__eyebrow', text: t('Mo đã nhận lịch của bạn') }),
    el('h3', { class: 'done__slot', text: result.slotLabel }),
    el('p', { class: 'done__code' }, t('Mã lịch '), el('strong', { text: result.bookingCode })),
    el('ol', { class: 'done__steps' },
      el('li', {}, t('Lời mời lịch sẽ tới email '), el('strong', { text: result.email }), t('. Bạn bấm "Có" để lưu vào lịch của mình.')),
      el('li', { text: t('Mo đối chiếu chuyển khoản và xác nhận trong vòng 24 giờ.') }),
      el('li', { text: t('Nếu ảnh chuyển khoản không khớp, Mo huỷ lịch và báo qua email. Bạn reply email đó nếu có nhầm lẫn.') })),
    messenger ? el('a', { class: 'btn btn--ghost', href: messenger, target: '_blank', rel: 'noopener', text: t('Cần gấp? Nhắn Mo qua Messenger') }) : null);
  container.replaceChildren(view);
  view.focus();
  view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
