import type { NavigateFunction } from 'storybook/internal/router';
import { type API } from 'storybook/manager-api';

import { REVIEW_CHANGES_URL } from './constants.ts';
import { exitReviewMode, isReviewModeActive, markReviewModeActive } from './review-mode.ts';
import {
  REVIEW_COLLECTION_QUERY_PARAM,
  buildReviewStoryTarget,
  isReviewReturnSearch,
  parseCanvasStoryIdFromReturnSearch,
  type ReviewNavEntry,
} from './review-navigation.ts';
import { reviewStore } from './review-store.ts';

/**
 * Navigate to a curated story within an active review. The summary overlay is
 * suppressed synchronously to avoid a flash before the route changes.
 */
export const navigateToReviewEntry = (
  api: API,
  navigate: NavigateFunction,
  entry: ReviewNavEntry
): void => {
  if (!isReviewModeActive()) {
    markReviewModeActive();
  }
  reviewStore.suppressSummaryOverlay();
  api.setQueryParams({ [REVIEW_COLLECTION_QUERY_PARAM]: String(entry.collectionIndex) });
  navigate(buildReviewStoryTarget(entry));
};

/** Navigate back to the review summary. */
export const navigateToReviewSummary = (api: API, navigate: NavigateFunction): void => {
  api.setQueryParams({ [REVIEW_COLLECTION_QUERY_PARAM]: null });
  navigate(REVIEW_CHANGES_URL);
};

const isReturnSearchNavigable = (api: API, returnSearch: string): boolean => {
  const storyId = parseCanvasStoryIdFromReturnSearch(returnSearch);
  if (!storyId) {
    return false;
  }
  const entry = api.resolveStory(storyId);
  return entry?.type === 'story' || entry?.type === 'docs';
};

/**
 * Leave review mode and return to the pre-review canvas. Restores chrome/filters
 * via {@link exitReviewMode} and navigates to the captured return search.
 */
export const navigateOutOfReview = (
  api: API,
  navigate: NavigateFunction,
  returnSearch: string | null | undefined
): void => {
  api.setQueryParams({ [REVIEW_COLLECTION_QUERY_PARAM]: null });
  reviewStore.releaseSummaryOverlaySuppression();
  void exitReviewMode(api);

  if (
    returnSearch &&
    !isReviewReturnSearch(returnSearch) &&
    isReturnSearchNavigable(api, returnSearch)
  ) {
    navigate(returnSearch.startsWith('?') ? returnSearch : `?${returnSearch}`, { plain: true });
    return;
  }

  api.selectFirstStory();
};
