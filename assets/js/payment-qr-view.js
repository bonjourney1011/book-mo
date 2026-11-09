import { t } from './ui-text.js';
import { el, formatVnd, copyText } from './dom-and-format-helpers.js';

// VietQR bank BIN → name shown for manual transfers.
const BANK_NAMES = {
  970436: 'Vietcombank', 970415: 'VietinBank', 970418: 'BIDV', 970405: 'Agribank',
  970407: 'Techcombank', 970422: 'MB Bank', 970416: 'ACB', 970432: 'VPBank',
  970423: 'TPBank', 970403: 'Sacombank', 970441: 'VIB', 970437: 'HDBank',
  970443: 'SHB', 970448: 'OCB', 970426: 'MSB', 970440: 'SeABank', 970431: 'Eximbank'
};

function vietQrUrl(payment) {
  const params = new URLSearchParams({
    amount: String(payment.amount),
    addInfo: payment.addInfo,
    accountName: payment.accountName || ''
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(payment.bankBin)}-${encodeURIComponent(payment.account)}-compact2.png?${params}`;
}

function payRow(label, value, copyValue, note) {
  const row = el('div', { class: 'copy-row' },
    el('span', { class: 'copy-row__label', text: label }),
    el('strong', { class: 'copy-row__value', text: value }));
  if (copyValue != null) {
    const button = el('button', { type: 'button', class: 'btn btn--ghost btn--small', text: t('Chép'), 'aria-label': t('Chép {label}', { label: label.toLowerCase() }) });
    button.addEventListener('click', () => copyText(copyValue, button));
    row.append(button);
  }
  if (note) row.append(el('span', { class: 'copy-row__note', text: note }));
  return row;
}

/**
 * Fills the step-3 card. quote = { bookingCode, slotLabel, payment }.
 * paidCode is set when the visitor already transferred for an earlier slot that got taken.
 */
export function renderPaymentCard(container, quote, paidCode) {
  const { payment } = quote;
  const children = [
    el('p', { class: 'pay__slot', text: quote.slotLabel }),
    el('p', { class: 'pay__code' }, t('Mã lịch: '), el('strong', { text: quote.bookingCode }))
  ];
  if (paidCode && paidCode !== quote.bookingCode) {
    children.push(el('p', { class: 'pay__note pay__note--warn', text: t('Bạn đã chuyển khoản với nội dung {code}. Không cần chuyển lại. Mo sẽ đối chiếu theo ảnh bạn gửi.', { code: paidCode }) }));
  }
  if (!payment) {
    children.push(el('p', { class: 'pay__note', text: t('Mo chưa điền tài khoản nhận tiền. Bạn nhắn Mo qua Messenger nhé.') }));
  } else {
    children.push(
      el('img', { class: 'pay__qr', src: vietQrUrl(payment), alt: t('Mã VietQR chuyển {amount}, nội dung {code}', { amount: formatVnd(payment.amount), code: payment.addInfo }), width: '280', height: '320' }),
      el('p', { class: 'pay__hint', text: t('Trên điện thoại: chụp màn hình mã QR, mở app ngân hàng, chọn Quét QR rồi chọn ảnh vừa chụp.') }),
      el('h4', { class: 'pay__manual-title', text: t('Hoặc chuyển khoản thủ công') }),
      payRow(t('Ngân hàng'), BANK_NAMES[payment.bankBin] || t('Xem tên ngân hàng trên mã QR')),
      payRow(t('Số tài khoản'), payment.account, payment.account),
      payment.accountName ? payRow(t('Chủ tài khoản'), payment.accountName) : null,
      payRow(t('Số tiền'), formatVnd(payment.amount), String(payment.amount)),
      payRow(t('Nội dung'), payment.addInfo, payment.addInfo, t('Giữ nguyên mã lịch để Mo đối chiếu nhanh.')));
  }
  container.replaceChildren(...children.filter(Boolean));
}
