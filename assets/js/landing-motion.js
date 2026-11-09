/**
 * Landing polish: scroll reveal, the phone sticky CTA, and the "nearest free slot" line in the hero.
 * Everything degrades to a static page when IntersectionObserver is missing.
 */
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function revealOnScroll() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in globalThis) || reducedMotion()) {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }
  // Siblings revealed together get a short stagger so a row of cards flows in.
  items.forEach((item) => {
    const index = [...item.parentElement.children].filter((child) => child.hasAttribute('data-reveal')).indexOf(item);
    item.style.transitionDelay = `${Math.min(index, 5) * 70}ms`;
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((item) => observer.observe(item));
}

/** Shows the bar when no other "Chọn giờ" button is on screen and the booking form is not in view. */
function stickyCta() {
  const bar = document.querySelector('[data-sticky-cta]');
  const watched = ['[data-hero-cta]', '[data-booking]', '[data-final-cta]'].map((s) => document.querySelector(s)).filter(Boolean);
  if (!bar || !('IntersectionObserver' in globalThis)) return;
  const visible = new Set();
  const link = bar.querySelector('a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
    const show = visible.size === 0;
    bar.classList.toggle('is-shown', show);
    bar.setAttribute('aria-hidden', String(!show));
    link.tabIndex = show ? 0 : -1;
  });
  watched.forEach((target) => observer.observe(target));
}

/** Fills "Lịch trống gần nhất" from the slots response the booking flow already fetched. */
function nearestSlot(bookingRoot) {
  const line = document.querySelector('[data-next-slot]');
  const text = document.querySelector('[data-next-slot-text]');
  if (!line || !bookingRoot) return;
  bookingRoot.addEventListener('slots-loaded', (event) => {
    const data = event.detail;
    const day = data?.open ? data.days?.[0] : null;
    if (!day?.slots?.length) { line.hidden = true; return; }
    const total = data.days.reduce((sum, d) => sum + d.slots.length, 0);
    text.textContent = `Lịch trống gần nhất: ${day.label}, ${day.slots[0].label.split('–')[0]} · còn ${total} khung trống`;
    line.hidden = false;
  });
}

export function initLandingMotion(bookingRoot) {
  revealOnScroll();
  stickyCta();
  nearestSlot(bookingRoot);
}
