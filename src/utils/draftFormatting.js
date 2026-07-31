const RELATIVE_UNITS = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/**
 * "2 hours ago" reads better than a timestamp in a list of drafts. Intl handles
 * the pluralisation and wording per locale, so no string templates are needed.
 */
export function formatRelativeTime(isoString) {
  const elapsed = new Date(isoString).getTime() - Date.now();
  const absolute = Math.abs(elapsed);

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absolute >= ms) {
      return relativeFormatter.format(Math.round(elapsed / ms), unit);
    }
  }

  return 'just now';
}

/** Absolute timestamp for the `title` tooltip, since "2 days ago" loses precision. */
export function formatAbsoluteTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Collapses whitespace so multi-line drafts do not render as a ragged block in
 * the list, and truncates on a word boundary rather than mid-word.
 */
export function buildExcerpt(content, maxLength = 140) {
  const normalised = content.replace(/\s+/g, ' ').trim();

  if (normalised.length <= maxLength) return normalised;

  const truncated = normalised.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
