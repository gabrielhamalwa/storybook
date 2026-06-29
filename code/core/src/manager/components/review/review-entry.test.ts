// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';

import { PRE_REVIEW_RETURN_KEY } from './constants.ts';
import { beginReviewCycle, capturePreReviewReturn } from './review-entry.ts';
import { isReviewModeActive } from './review-mode.ts';
import { sessionStore } from './session-store.ts';

beforeEach(() => {
  sessionStorage.clear();
});

describe('capturePreReviewReturn', () => {
  it('stores the current story search before entering review', () => {
    capturePreReviewReturn('?path=/story/foo--bar');
    expect(sessionStore.read(PRE_REVIEW_RETURN_KEY)).toBe('?path=/story/foo--bar');
  });

  it('ignores review routes and non-canvas pages', () => {
    capturePreReviewReturn('?path=/review/');
    expect(sessionStore.read(PRE_REVIEW_RETURN_KEY)).toBeNull();

    capturePreReviewReturn('?path=/settings/about');
    expect(sessionStore.read(PRE_REVIEW_RETURN_KEY)).toBeNull();
  });

  it('preserves the first snapshot when called multiple times in one cycle', () => {
    capturePreReviewReturn('?path=/story/foo--bar');
    capturePreReviewReturn('?path=/story/baz--qux');
    expect(sessionStore.read(PRE_REVIEW_RETURN_KEY)).toBe('?path=/story/foo--bar');
  });

  it('does not overwrite after review mode is active', () => {
    capturePreReviewReturn('?path=/story/foo--bar');
    beginReviewCycle();
    capturePreReviewReturn('?path=/story/baz--qux');
    expect(sessionStore.read(PRE_REVIEW_RETURN_KEY)).toBe('?path=/story/foo--bar');
  });
});

describe('beginReviewCycle', () => {
  it('marks review mode active once per cycle', () => {
    beginReviewCycle();
    beginReviewCycle();
    expect(isReviewModeActive()).toBe(true);
  });
});
