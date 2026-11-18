import { t } from './ui-text.js';
import { requestQuote, submitBooking } from './booking-api-client.js';
import { createSlotStep } from './slot-step.js';
import { renderPaymentCard } from './payment-qr-view.js';
import { resizeBillImage } from './bill-image-resizer.js';
import { renderBookingSuccess } from './booking-success-view.js';
import { attachBillSources, isDesktopPointer } from './bill-input-sources.js';
import { takeHandoffDraft } from './phone-handoff.js';
import { attachPhoneHandoff } from './phone-handoff-panel.js';

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
  const state = { slot: null, quote: null, bill: null, paidCode: '', requestId: newRequestId(), handoffRequestId: '', carriedFillMs: 0 };
  let stopPhoneWatch = () => {};

  const show = (n, { scroll = true } = {}) => {
    // Leaving the upload step invalidates the phone QR: slot or contact may change before coming back.
    if (n !== 4) { handoff.open = false; handoffQr.removeAttribute('src'); stopPhoneWatch(); }
    steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== n; });
    markers.forEach((m) => {
      const k = Number(m.dataset.stepMarker);
      m.dataset.state = k < n ? 'done' : k === n ? 'current' : '';
    });
    if (!scroll) return;
    steps.find((step) => Number(step.dataset.step) === n)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  /** Step 5, from this computer's own submit or from the phone (seen by the status check). */
  const finish = (booking) => { renderBookingSuccess(doneBox, booking); show(5); };
  const fillMs = () => Math.max(Math.round(performance.now() - startedAt), state.carriedFillMs);
  const contact = () => {
    const data = new FormData(form);
    return { name: data.get('name'), email: data.get('email'), purpose: data.get('purpose'), website: data.get('website') };
  };

  const slotStep = createSlotStep({
    root, statusBox: slotStatus, listBox: slotsBox, isActive: () => !steps[0].hidden,
    onPick: (slot) => {
      state.slot = slot;
      // New slot = new id, except on a phone opened from the QR: the computer is watching that id (only a successful booking caches it).
      state.requestId = state.handoffRequestId || newRequestId();
      chosenText.textContent = slot.label;
      show(2);
    }
  });
  /** Back to the calendar after the chosen slot was taken or held by someone else. */
  const slotGone = (message) => { state.slot = null; slotStep.forget(); show(1); return slotStep.load(message); };

  /** Asks the API for the booking code + bank details. Returns true when the quote is ready. */
  async function quote(takenMessage) {
    formError.textContent = '';
    const result = await requestQuote({ slot: state.slot.key, ...contact(), fillMs: fillMs(), source });
    if (!result.ok) {
      if (result.slotTaken) { await slotGone(takenMessage || result.error); return false; }
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
    stopPhoneWatch = attachPhoneHandoff({
      panel: handoff, qrImage: handoffQr, textBox: $('[data-handoff-text]'),
      isOnUploadStep: () => !uploadStep.hidden, onBooked: finish,
      getDraft: () => {
        if (!state.slot) return null;
        const { name, email, purpose } = contact();
        return { k: state.slot.key, n: name || '', e: email || '', p: purpose || '', c: state.paidCode, r: state.requestId, f: fillMs() };
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
    if (result.ok) { finish(result); return; }
    if (result.slotTaken) { await slotGone(`${result.error} ${t('Bạn không cần chuyển khoản lại, Mo sẽ đối chiếu theo ảnh bạn gửi.')}`); return; }
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
    state.requestId = state.handoffRequestId = draft.r || state.requestId;
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
  slotStep.load();
  const draft = takeHandoffDraft();
  if (draft) resumeFromHandoff(draft);
}
