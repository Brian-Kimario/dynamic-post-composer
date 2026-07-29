import { getWarningThreshold } from '../config/platforms';

/**
 * Validation is pure and framework-free: it takes content plus a platform
 * config and returns a plain result object. Keeping it outside React means it
 * can be unit tested, reused on a server in a later experiment, and reasoned
 * about without rendering anything.
 */

export const VALIDATION_STATUS = {
  EMPTY: 'empty',
  VALID: 'valid',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * Counts what a user perceives as a character rather than what JavaScript
 * stores. `"👍".length` is 2 because the emoji is a surrogate pair, and a
 * flag or skin-tone emoji can be 4+. Intl.Segmenter groups those into single
 * grapheme clusters, so the counter matches the user's expectation.
 */
export function countCharacters(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const _segment of segmenter.segment(text)) {
      count += 1;
    }
    return count;
  }

  // Array spreading splits on code points, which still handles the common
  // surrogate-pair case correctly even where Intl.Segmenter is unavailable.
  return [...text].length;
}

function buildMessage(status, { platform, remainingCharacters }) {
  switch (status) {
    case VALIDATION_STATUS.EMPTY:
      return `Write your post to publish it to ${platform.name}.`;
    case VALIDATION_STATUS.WARNING:
      return `You are close to the ${platform.name} limit — ${remainingCharacters} characters left.`;
    case VALIDATION_STATUS.ERROR:
      return `Your post is ${Math.abs(remainingCharacters)} characters over the ${platform.name} limit.`;
    default:
      return `Your post is ready to publish to ${platform.name}.`;
  }
}

/**
 * Resolves the single status that should drive the UI.
 *
 * Order matters. Being over the limit is checked before emptiness so that
 * whitespace-only content that also overflows reports the more actionable
 * problem. In every realistic case only one branch can apply anyway.
 */
function resolveStatus({ isEmpty, isOverLimit, usageRatio, warningThreshold }) {
  if (isOverLimit) return VALIDATION_STATUS.ERROR;
  if (isEmpty) return VALIDATION_STATUS.EMPTY;
  if (usageRatio >= warningThreshold) return VALIDATION_STATUS.WARNING;
  return VALIDATION_STATUS.VALID;
}

/**
 * Future experiments can add rules (hashtag caps, link restrictions, media
 * requirements) by extending the metrics above and adding cases to
 * `resolveStatus`. The returned shape is what the whole UI depends on, so
 * additions should be additive rather than changes to existing fields.
 */
export function validatePost(content, platform) {
  const characterCount = countCharacters(content);
  const characterLimit = platform.characterLimit;
  const remainingCharacters = characterLimit - characterCount;
  const usageRatio = characterLimit > 0 ? characterCount / characterLimit : 0;
  const warningThreshold = getWarningThreshold(platform);

  // Trimmed so a post of only spaces or newlines cannot be published, while the
  // visible character count still reflects exactly what the user typed.
  const isEmpty = content.trim().length === 0;
  const isOverLimit = characterCount > characterLimit;

  const status = resolveStatus({
    isEmpty,
    isOverLimit,
    usageRatio,
    warningThreshold,
  });

  return {
    status,
    isValid: status === VALIDATION_STATUS.VALID || status === VALIDATION_STATUS.WARNING,
    characterCount,
    characterLimit,
    remainingCharacters,
    usageRatio,
    isEmpty,
    isOverLimit,
    platformId: platform.id,
    message: buildMessage(status, { platform, remainingCharacters }),
  };
}
