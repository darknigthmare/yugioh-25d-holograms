/** A public Exodia hand is proved by its native WIN in the same completed
 * message batch, never by an inspection, card name or JavaScript hand count. */
export const NATIVE_EXODIA_PUBLIC_SOURCE = Object.freeze({ code: 33396948,
  filename: 'c33396948.lua',
  sha256: 'f5b9907d008d4905fbe87c4236339642ffc8e9aedc924fed4c9c04e7c4a0e131' });
const pieces = new Set([33396948, 70903634, 44519536, 8124921, 7902349]);

export function collectNativeExodiaPublicConfirmations(messages = []) {
  const accepted = new WeakSet();
  const wins = messages.filter(message => message?.type === 5
    && message.reason === 16 && [0, 1, 2].includes(message.player));
  if (!wins.length) return accepted;
  for (const message of messages) {
    if (message?.type !== 31 || ![0, 1].includes(message.player)) continue;
    const owner = 1 - message.player;
    if (!wins.some(win => win.player === owner || win.player === 2)) continue;
    if (!Array.isArray(message.cards) || message.cards.length < 5) continue;
    const sequences = new Set(), codes = new Set();
    let valid = true;
    for (const card of message.cards) {
      if (card.controller !== owner || card.location !== 2
        || !Number.isSafeInteger(card.code) || card.code <= 0
        || !Number.isInteger(card.sequence) || card.sequence < 0
        || sequences.has(card.sequence)) { valid = false; break; }
      sequences.add(card.sequence); codes.add(card.code);
    }
    if (valid && [...pieces].every(code => codes.has(code))) accepted.add(message);
  }
  return accepted;
}
