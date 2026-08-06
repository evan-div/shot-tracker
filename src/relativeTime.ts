const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "added 3m ago" style timestamps. Deliberately coarse — during an event
 * nobody needs second-level precision, and coarse values change less often.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';

  const elapsed = Math.max(0, now - then);

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;

  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Label for the outbound link button, based on where it points. */
export function linkLabel(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'Open link';
  }

  if (host.endsWith('instagram.com')) return 'Open in Instagram';
  if (host.endsWith('tiktok.com')) return 'Open in TikTok';
  if (host.endsWith('youtube.com') || host === 'youtu.be') return 'Open in YouTube';
  if (host.endsWith('facebook.com')) return 'Open in Facebook';
  return 'Open link';
}

/** Only http(s) links are safe to render as an anchor. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
