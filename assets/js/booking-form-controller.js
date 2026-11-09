import { t } from './ui-text.js';
import { fetchSlots, requestQuote, submitBooking } from './booking-api-client.js';
import { renderSlotPicker } from './slot-picker.js';
import { renderPaymentCard } from './payment-qr-view.js';
import { resizeBillImage } from './bill-image-resizer.js';
import { renderBookingSuccess } from './booking-success-view.js';
import { attachBillSources, isDesktopPointer } from './bill-input-sources.js';
import { handoffUrl, takeHandoffDraft, drawHandoffQr } from './phone-handoff.js';

const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Five static steps in index.html (data-step="1".."5"); this moves between them and keeps
 * everything the visitor typed, so a "slot just taken" bounce never loses their work.
 */
export function initBookingFlow({ root, source }) {
  const $ = (selector) => root.querySelector(selector);
  const steps = [...root.querySelectorAll('[data-step]')];
  const markers = [...root.querySelectorAll('[data-step-marker]')];
  const slotsBox = $('[data-slots]');
  const slotStatus = $('[data-slots-status]');
  const chosenText = $('[data-chosen-slot]');
  const form = $('[data-booking-form]');
  const formError = $('[data-form-error]');
  const payBox = $('[data-payment]');
  const uploadStep = $('[data-step="4"]');
  const fileInput = $('[data-bill-file]');
  const preview = $('[data-bill-preview]');
  const billError = $('[data-bill-error]');
  const submitButton = $('[data-submit]');
  const doneBox = $('[data-done]');
  const handoff = $('[data-handoff]');
  const handoffQr = $('[data-handoff-qr]');
  const resumeSummary = $('[data-resume-summary]');
  const startedAt = performance.now();
  const state = { slot: null, quote: null, bill: null, paidCode: '', requestId: newRequestId(), carriedFillMs: 0 };

  const show = (n, { scroll = true } = {}) => {
    // Leaving the upload step invalidates the phone QR: slot or contact may change before coming back.
    if (n !== 4) { handoff.open = false; handoffQr.removeAttribute('src'); }
    steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== n; });
    markers.forEach((m) => {
      const k = Number(m.dataset.stepMarker);
      m.dataset.state = k < n ? 'done' : k === n ? 'current' : '';
    });
    if (!scroll) return;
    steps.find((step) => Number(step.dataset.step) === n)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const fillMs = () => Math.max(Math.round(performance.now() - startedAt), state.carriedFillMs);
  const contact = () => {
    const data = new FormData(form);
    return { name: data.get('name'), email: data.get('email'), purpose: data.get('purpose'), website: data.get('website') };
  };

  async function loadSlots(message) {
    slotStatus.textContent = message || t('Đang tải khung giờ trống…');
    slotsBox.replaceChildren();
    const data = await fetchSlots();
    // The landing hero shows the nearest free slot from the same response (no second request).
    root.dispatchEvent(new CustomEvent('slots-loaded', { detail: data }));
    if (!data) { slotStatus.textContent = t('Chưa tải được lịch. Bạn tải lại trang hoặc nhắn Mo nhé.'); return; }
    if (!data.open) { slotStatus.textContent = t('Mo đang tạm đóng lịch. Bạn ghé lại sau nhé.'); return; }
    slotStatus.textContent = message || t('Mỗi buổi {n} phút. Bạn chọn ngày rồi chọn giờ.', { n: data.slotMinutes });
    renderSlotPicker(slotsBox, data.days, (slot) => {
      state.slot = slot;
      // A new slot is a new booking: a replayed id must never return an older slot's answer.
      state.requestId = newRequestId();
      chosenText.textContent = slot.label;
      show(2);
    });
  }

  /** Asks the API for the booking code + bank details. Returns true when the quote is ready. */
  async function quote(takenMessage) {
    formError.textContent = '';
    const result = await requestQuote({ slot: state.slot.key, ...contact(), fillMs: fillMs(), source });
    if (!result.ok) {
      if (result.slotTaken) { state.slot = null; await loadSlots(takenMessage || result.error); show(1); return false; }
      formError.textContent = result.error;
      show(2);
      return false;
    }
    state.quote = result;
    renderPaymentCard(payBox, result, state.paidCode);
    return true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';
    if (!form.reportValidity()) return;
    if (!state.slot) { show(1); return; }
    resumeSummary.hidden = true;
    const button = form.querySelector('[data-quote]');
    button.disabled = true;
    button.textContent = t('Đang kiểm tra khung giờ…');
    const ready = await quote();
    button.disabled = false;
    button.textContent = t('Tiếp tục');
    if (ready) show(3);
  });

  $('[data-paid]').addEventListener('click', () => {
    if (!state.paidCode) state.paidCode = state.quote.bookingCode;
    show(4);
  });

  async function useBillFile(file) {
    billError.textContent = '';
    state.bill = null;
    preview.hidden = true;
    try {
      state.bill = await resizeBillImage(file);
      preview.src = state.bill.dataUrl;
      preview.hidden = false;
    } catch (error) {
      billError.textContent = error.message === 'too-large'
        ? t('Ảnh quá lớn. Bạn chụp màn hình rồi chọn lại nhé.')
        : t('Ảnh không đọc được. Bạn chụp màn hình rồi chọn lại nhé.');
    }
    fileInput.value = '';
  }
  attachBillSources({
    dropZone: $('[data-bill-drop]'), fileInput, isActive: () => !uploadStep.hidden, onFile: useBillFile,
    onReject: () => { billError.textContent = t('File này không phải ảnh. Bạn chọn ảnh JPG hoặc PNG nhé.'); }
  });

  if (isDesktopPointer()) {
    $('[data-upload-hint]').textContent = t('Chọn ảnh, kéo thả ảnh vào đây, hoặc dán ảnh bằng Ctrl+V. Trang tự thu nhỏ ảnh trước khi gửi.');
    handoff.hidden = false;
    handoff.addEventListener('toggle', async () => {
      if (!handoff.open || !state.slot) return;
      const { name, email, purpose } = contact();
      const draft = { k: state.slot.key, n: name || '', e: email || '', p: purpose || '', c: state.paidCode, r: state.requestId, f: fillMs() };
      try {
        await drawHandoffQr(handoffQr, handoffUrl(draft));
      } catch {
        $('[data-handoff-text]').textContent = t('Chưa tạo được mã QR. Bạn gửi ảnh qua Zalo hoặc Messenger cho chính mình, rồi dán vào đây bằng Ctrl+V nhé.');
      }
    });
  }

  submitButton.addEventListener('click', async () => {
    billError.textContent = '';
    if (!state.bill) { billError.textContent = t('Bạn chọn ảnh chụp màn hình chuyển khoản trước nhé.'); return; }
    submitButton.disabled = true;
    submitButton.textContent = t('Đang gửi…');
    const result = await submitBooking({
      requestId: state.requestId, slot: state.slot.key, ...contact(),
      billBase64: state.bill.base64, billMime: state.bill.mime, paidCode: state.paidCode, fillMs: fillMs(), source
    });
    submitButton.disabled = false;
    submitButton.textContent = t('Gửi lịch');
    if (result.ok) { renderBookingSuccess(doneBox, result); show(5); return; }
    if (result.slotTaken) {
      state.slot = null;
      await loadSlots(t('Khung giờ vừa có người đặt. Bạn chọn khung khác, không cần chuyển khoản lại, Mo sẽ đối chiếu.'));
      show(1);
      return;
    }
    billError.textContent = result.error;
  });

  root.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => show(Number(button.dataset.back)));
  });

  /** Opened from the QR shown on a computer: refill the form, re-quote, jump to the upload step. */
  async function resumeFromHandoff(draft) {
    form.elements.name.value = draft.n;
    form.elements.email.value = draft.e;
    form.elements.purpose.value = draft.p;
    state.slot = { key: draft.k, label: '' };
    state.paidCode = draft.c;
    // Same request id as the computer: if both devices send, the server keeps one booking.
    state.requestId = draft.r || state.requestId;
    state.carriedFillMs = draft.f;
    slotStatus.textContent = t('Đang mở lịch bạn đặt trên máy tính…');
    root.scrollIntoView({ block: 'start' });
    const ready = await quote(t('Khung giờ này đã có lịch. Nếu bạn vừa gửi lịch trên máy tính thì lịch đã được giữ, bạn xem email nhé. Nếu chưa, bạn chọn khung khác.'));
    // The visitor tapped another slot while the quote was loading: their new choice wins.
    if (!ready || state.slot?.key !== draft.k) return;
    // Labels come from the server, never from the link, so a crafted link cannot put its own text here.
    state.slot.label = state.quote.slotLabel;
    chosenText.textContent = state.quote.slotLabel;
    $('[data-resume-text]').textContent = `${state.quote.slotLabel} · ${draft.e}`;
    resumeSummary.hidden = false;
    if (!draft.p) { formError.textContent = t('Bạn viết lại vài dòng về điều muốn trao đổi rồi bấm Tiếp tục nhé.'); show(2); return; }
    show(4, { scroll: false });
  }

  show(1, { scroll: false });
  loadSlots();
  const draft = takeHandoffDraft();
  if (draft) resumeFromHandoff(draft);
}
