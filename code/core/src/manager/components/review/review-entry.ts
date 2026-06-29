import { parsePath } from 'storybook/internal/router';

import { PRE_REVIEW_RETURN_KEY } from './constants.ts';
import { isReviewModeActive, markReviewModeActive } from './review-mode.ts';
import { isReviewReturnSearch } from './review-navigation.ts';
import { sessionStore } from './session-store.ts';

const normalizeSearch = (search: string): string =>
  search.startsWith('?') ? search : `?${search}`;

/** Capture the current story/docs URL before entering a new review cycle. */
export const capturePreReviewReturn = (search: string | null | undefined): void => {
  if (!search || isReviewReturnSearch(search)) {
    return;
  }

  const path =
    new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('path') ?? '';
  const { viewMode } = parsePath(path);
  if (viewMode !== 'story' && viewMode !== 'docs') {
    return;
  }

  sessionStore.write(PRE_REVIEW_RETURN_KEY, normalizeSearch(search));
};

/** Mark review mode active at the start of a new review cycle (after a full exit). */
export const beginReviewCycle = (): void => {
  if (isReviewModeActive()) {
    return;
  }
  markReviewModeActive();
};
