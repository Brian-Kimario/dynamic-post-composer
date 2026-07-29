/**
 * Central platform configuration.
 *
 * Every platform-specific rule lives here so that components never branch on a
 * platform id. Adding a platform in a later experiment should mean adding one
 * entry to this object and nothing else.
 *
 * Character limits are the publicly documented limits for a standard text post.
 * They are deliberately simplified: premium tiers, media captions and thread
 * continuations use different limits and are out of scope for Experiment 1.1.1.
 */

/**
 * Fraction of the limit at which the composer starts warning the user.
 * Kept as a named constant so the threshold is never a magic number sprinkled
 * through validation or UI code.
 */
export const WARNING_THRESHOLD = 0.9;

export const PLATFORMS = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    monogram: 'f',
    accentColor: '#1877F2',
    characterLimit: 63206,
    placeholder: 'Share an update with your Facebook audience…',
  },
  x: {
    id: 'x',
    name: 'X',
    monogram: 'X',
    accentColor: '#0F1419',
    characterLimit: 280,
    placeholder: 'What is happening?',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    monogram: 'in',
    accentColor: '#0A66C2',
    characterLimit: 3000,
    placeholder: 'Share a professional insight or update…',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    monogram: 'ig',
    accentColor: '#E1306C',
    characterLimit: 2200,
    placeholder: 'Write a caption for your post…',
  },
};

/**
 * Rendering order for the selector. Derived from PLATFORMS so the two can never
 * drift apart, which is exactly the kind of duplication a config-driven design
 * is meant to remove.
 */
export const PLATFORM_LIST = Object.values(PLATFORMS);

export const DEFAULT_PLATFORM_ID = PLATFORMS.x.id;

export function getPlatform(platformId) {
  const platform = PLATFORMS[platformId];

  if (!platform) {
    throw new Error(`Unknown platform: "${platformId}"`);
  }

  return platform;
}

/**
 * A platform may later opt out of the shared threshold (for example, a platform
 * with a very small limit might want to warn earlier). Reading it through this
 * helper means that future override needs no changes in the validation layer.
 */
export function getWarningThreshold(platform) {
  return platform.warningThreshold ?? WARNING_THRESHOLD;
}
