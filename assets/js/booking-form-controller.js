import { fetchSlots, requestQuote, submitBooking } from './booking-api-client.js';
import { renderSlotPicker } from './slot-picker.js';
import { renderPaymentCard } from './payment-qr-view.js';
import { resizeBillImage } from './bill-image-resizer.js';
import { renderBookingSuccess } from './booking-success-view.js';

const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Five static steps in index.html (data-step="1".."5"); this moves between them and keeps
 * everything the visitor typed, so a "slot just taken" bounce never loses their work.
 */
export function initBookingFlow({ root, source }) {
  const steps = [...root.querySelectorAll('[data-step]')];
  const markers = [...root.querySelectorAll('[data-step-marker]')];
  const slotsBox = root.querySelector('[data-slots]');
  const slotStatus = root.querySelector('[data-slots-status]');
  const chosenText = root.querySelector('[data-chosen-slot]');
  const form = root.querySelector('[data-booking-form]');
  const formError = root.querySelector('[data-form-error]');
  const payBox = root.querySelector('[data-payment]');
  const fileInput = root.querySelector('[data-bill-file]');
  const preview = root.querySelector('[data-bill-preview]');
  const billError = root.querySelector('[data-bill-error]');
  const submitButton = root.querySelector('[data-submit]');
  const doneBox = root.querySelector('[data-done]');
  const startedAt = performance.now();
  const state = { slot: null, quote: null, bill: null, paidCode: '', requestId: newRequestId() };

  const show = (n, { scroll = true } = {}) => {
    steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== n; });
    markers.forEach((m) => {
      const k = Number(m.dataset.stepMarker);
      m.dataset.state = k < n ? 'done' : k === n ? 'current' : '';
    });
    if (!scroll) return;
    steps.find((step) => Number(step.dataset.step) === n)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const fillMs = () => Math.round(performance.now() - startedAt);
  const contact = () => {
    const data = new FormData(form);
    return { name: data.get('name'), email: data.get('email'), purpose: data.get('purpose'), website: data.get('website') };
  };

  async function loadSlots(message) {
    slotStatus.textContent = message || 'Đang tải khung giờ trống…';
    slotsBox.replaceChildren();
    const data = await fetchSlots();
    if (!data) { slotStatus.textContent = 'Chưa tải được lịch. Bạn tải lại trang hoặc nhắn Mo nhé.'; return; }
    if (!data.open) { slotStatus.textContent = 'Mo đang tạm đóng lịch. Bạn ghé lại sau nhé.'; return; }
    slotStatus.textContent = message || `Mỗi buổi ${data.slotMinutes} phút. Bạn chọn ngày rồi chọn giờ.`;
    renderSlotPicker(slotsBox, data.days, (slot) => {
      state.slot = slot;
      // A new slot is a new booking: a replayed id must never return an older slot's answer.
      state.requestId = newRequestId();
      chosenText.textContent = slot.label;
      show(2);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';
    if (!form.reportValidity()) return;
    if (!state.slot) { show(1); return; }
    const button = form.querySelector('[data-quote]');
    button.disabled = true;
    button.textContent = 'Đang kiểm tra khung giờ…';
    const result = await requestQuote({ slot: state.slot.key, ...contact(), fillMs: fillMs(), source });
    button.disabled = false;
    button.textContent = 'Tiếp tục';
    if (!result.ok) {
      if (result.slotTaken) { state.slot = null; await loadSlots(result.error); show(1); return; }
      formError.textContent = result.error;
      return;
    }
    state.quote = result;
    renderPaymentCard(payBox, result, state.paidCode);
    show(3);
  });

  root.querySelector('[data-paid]').addEventListener('click', () => {
    if (!state.paidCode) state.paidCode = state.quote.bookingCode;
    show(4);
  });

  fileInput.addEventListener('change', async () => {
    billError.textContent = '';
    state.bill = null;
    preview.hidden = true;
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      state.bill = await resizeBillImage(file);
      preview.src = state.bill.dataUrl;
      preview.hidden = false;
    } catch (error) {
      billError.textContent = error.message === 'too-large'
        ? 'Ảnh quá lớn. Bạn chụp màn hình rồi chọn lại nhé.'
        : 'Ảnh không đọc được. Bạn chụp màn hình rồi chọn lại nhé.';
      fileInput.value = '';
    }
  });

  submitButton.addEventListener('click', async () => {
    billError.textContent = '';
    if (!state.bill) { billError.textContent = 'Bạn chọn ảnh chụp màn hình chuyển khoản trước nhé.'; return; }
    submitButton.disabled = true;
    submitButton.textContent = 'Đang gửi…';
    const result = await submitBooking({
      requestId: state.requestId, slot: state.slot.key, ...contact(),
      billBase64: state.bill.base64, billMime: state.bill.mime, paidCode: state.paidCode, fillMs: fillMs(), source
    });
    submitButton.disabled = false;
    submitButton.textContent = 'Gửi lịch';
    if (result.ok) { renderBookingSuccess(doneBox, result); show(5); return; }
    if (result.slotTaken) {
      state.slot = null;
      await loadSlots('Khung giờ vừa có người đặt. Bạn chọn khung khác, không cần chuyển khoản lại, Mo sẽ đối chiếu.');
      show(1);
      return;
    }
    billError.textContent = result.error;
  });

  root.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => show(Number(button.dataset.back)));
  });

  show(1, { scroll: false });
  loadSlots();
}
