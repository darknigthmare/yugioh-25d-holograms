/**
 * Escapes untrusted text before inserting the small amount of supported
 * formatting markup used by the duel log and inspector.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Accepts only HTTP(S) image URLs (including same-origin relative URLs).
 * Invalid or active-content schemes fall back to a known-safe URL.
 */
export function safeImageUrl(value, fallback = '') {
  if (!value) return fallback;

  try {
    const baseUrl = globalThis.location?.href || 'http://localhost/';
    const url = new URL(String(value), baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : fallback;
  } catch {
    return fallback;
  }
}
