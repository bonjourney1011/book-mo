/**
 * Payment-step holds (CacheService only, no Sheet writes). When a visitor reaches the QR step, the slot is
 * held for their email for HOLD_MINUTES, so a second person cannot pay for the same slot meanwhile.
 * hold_<slotKey> = owner email; holdby_<email> = the slot that email holds, so picking another slot
 * releases the first one. Called inside the doPost lock, so check-then-place cannot race.
 */
var HOLD_MINUTES = 15;

function holdOwner_(cache, key) {
  return cache.get('hold_' + key) || '';
}

function placeHold_(cache, key, email) {
  var previous = cache.get('holdby_' + email);
  if (previous && previous !== key && holdOwner_(cache, previous) === email) cache.remove('hold_' + previous);
  cache.put('hold_' + key, email, HOLD_MINUTES * 60);
  cache.put('holdby_' + email, key, HOLD_MINUTES * 60);
}

/** After a booking is saved the Sheet row blocks the slot, so the hold is no longer needed. */
function releaseHold_(cache, key, email) {
  if (holdOwner_(cache, key) === email) cache.remove('hold_' + key);
  cache.remove('holdby_' + email);
}

/** { slotKey: true } for every slot someone is holding right now (one cache round trip). */
function heldSlotKeys_(cache, slots) {
  var names = slots.map(function (slot) { return 'hold_' + slot.key; });
  var found = names.length ? cache.getAll(names) : {};
  var held = {};
  Object.keys(found).forEach(function (name) { held[name.slice('hold_'.length)] = true; });
  return held;
}
