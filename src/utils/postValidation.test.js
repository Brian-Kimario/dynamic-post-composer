import { describe, expect, it } from 'vitest';
import { VALIDATION_STATUS, countCharacters, validatePost } from './postValidation';
import { PLATFORMS, WARNING_THRESHOLD } from '../config/platforms';

const x = PLATFORMS.x; // 280 characters — the tightest limit, so the easiest to reason about.

const repeat = (count) => 'a'.repeat(count);

describe('countCharacters', () => {
  it('counts plain text by character', () => {
    expect(countCharacters('hello')).toBe(5);
  });

  it('counts an emoji as one character, not as its surrogate pair', () => {
    // '👍'.length is 2; the user sees one character.
    expect(countCharacters('👍')).toBe(1);
  });

  it('counts a multi-codepoint grapheme as one', () => {
    // A skin-tone emoji is a base plus a modifier — still one thing on screen.
    expect(countCharacters('👍🏽')).toBe(1);
    expect(countCharacters('a👍🏽b')).toBe(3);
  });

  it('counts an empty string as zero', () => {
    expect(countCharacters('')).toBe(0);
  });
});

describe('validatePost', () => {
  it('reports empty for no content', () => {
    const result = validatePost('', x);

    expect(result.status).toBe(VALIDATION_STATUS.EMPTY);
    expect(result.isValid).toBe(false);
    expect(result.isEmpty).toBe(true);
  });

  it('treats whitespace-only content as empty, while still counting it', () => {
    const result = validatePost('   \n  ', x);

    expect(result.status).toBe(VALIDATION_STATUS.EMPTY);
    // The counter shows what was typed even though it cannot be published.
    expect(result.characterCount).toBe(6);
  });

  it('is valid comfortably under the limit', () => {
    const result = validatePost('A normal post.', x);

    expect(result.status).toBe(VALIDATION_STATUS.VALID);
    expect(result.isValid).toBe(true);
    expect(result.remainingCharacters).toBe(x.characterLimit - 14);
  });

  it('warns at the threshold and is still publishable', () => {
    const atThreshold = repeat(Math.ceil(x.characterLimit * WARNING_THRESHOLD));
    const result = validatePost(atThreshold, x);

    expect(result.status).toBe(VALIDATION_STATUS.WARNING);
    // A warning is advice, not a block.
    expect(result.isValid).toBe(true);
  });

  it('is valid just below the threshold', () => {
    const justUnder = repeat(Math.floor(x.characterLimit * WARNING_THRESHOLD) - 1);
    expect(validatePost(justUnder, x).status).toBe(VALIDATION_STATUS.VALID);
  });

  it('accepts exactly the limit', () => {
    const result = validatePost(repeat(x.characterLimit), x);

    expect(result.isOverLimit).toBe(false);
    expect(result.remainingCharacters).toBe(0);
    expect(result.isValid).toBe(true);
  });

  it('errors one character past the limit', () => {
    const result = validatePost(repeat(x.characterLimit + 1), x);

    expect(result.status).toBe(VALIDATION_STATUS.ERROR);
    expect(result.isValid).toBe(false);
    expect(result.remainingCharacters).toBe(-1);
    expect(result.message).toMatch(/1 characters over/);
  });

  it('applies each platform its own limit, without branching on the id', () => {
    const content = repeat(500);

    expect(validatePost(content, PLATFORMS.x).isOverLimit).toBe(true);
    expect(validatePost(content, PLATFORMS.facebook).isOverLimit).toBe(false);
  });

  it('names the platform in every message', () => {
    expect(validatePost('', x).message).toContain('X');
    expect(validatePost('ok', PLATFORMS.linkedin).message).toContain('LinkedIn');
  });
});
