import { useRef, type MutableRefObject } from 'react';

import type { StatusValue } from 'storybook/internal/types';
import { useStorybookState } from 'storybook/manager-api';

import { type ReviewModeFilters } from './review-mode.ts';

/**
 * Keep the current sidebar filters in a ref so click/shortcut handlers can read
 * them without re-binding. The review summary snapshots these once per browser
 * session and restores them on exit; the ref stays in sync with the store.
 */
export const useReviewFiltersRef = (): MutableRefObject<ReviewModeFilters> => {
  const { includedStatusFilters, excludedStatusFilters, includedTagFilters, excludedTagFilters } =
    useStorybookState();

  const filtersRef = useRef<ReviewModeFilters>({
    includedStatusFilters: [],
    excludedStatusFilters: [],
    includedTagFilters: [],
    excludedTagFilters: [],
  });
  filtersRef.current = {
    includedStatusFilters: (includedStatusFilters ?? []) as StatusValue[],
    excludedStatusFilters: (excludedStatusFilters ?? []) as StatusValue[],
    includedTagFilters: includedTagFilters ?? [],
    excludedTagFilters: excludedTagFilters ?? [],
  };
  return filtersRef;
};
