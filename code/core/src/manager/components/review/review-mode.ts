import type { StatusValue } from 'storybook/internal/types';
import type { API } from 'storybook/manager-api';

import { REVIEW_NAMESPACE } from '../../../shared/review/index.ts';
import { REVIEWING_STATUS_VALUE } from './review-status.ts';
import { sessionStore } from './session-store.ts';

// Persisted flag marking the manager as being in review mode. Review mode is
// interaction-driven (never inferred from the URL) and survives reloads via
// this key.
const REVIEW_MODE_SESSION_KEY = `${REVIEW_NAMESPACE}/review-mode`;

// Snapshot of the manager chrome (sidebar/addon panel visibility) taken on the
// first review-page visit in a browser session, restored on exit.
const CHROME_SNAPSHOT_SESSION_KEY = `${REVIEW_NAMESPACE}/chrome-snapshot`;

// Marks that chrome was collapsed once this browser session.
const CHROME_INITIALIZED_SESSION_KEY = `${REVIEW_NAMESPACE}/chrome-initialized`;

// Snapshot of the sidebar filters taken on the first review-page visit in a
// browser session, restored on exit.
const FILTERS_SNAPSHOT_SESSION_KEY = `${REVIEW_NAMESPACE}/filters-snapshot`;

// Last review `createdAt` the reviewing-only filter was applied for.
const LAST_FILTER_APPLIED_CREATED_AT_KEY = `${REVIEW_NAMESPACE}/last-filter-applied-created-at`;

/** Sidebar filter snapshot preserved across a review-mode session. */
export interface ReviewModeFilters {
  includedStatusFilters: StatusValue[];
  excludedStatusFilters: StatusValue[];
  includedTagFilters: string[];
  excludedTagFilters: string[];
}

type ReviewModeApi = Pick<
  API,
  | 'toggleNav'
  | 'togglePanel'
  | 'getIsNavShown'
  | 'getIsPanelShown'
  | 'setAllStatusFilters'
  | 'setAllTagFilters'
>;

/** Whether the manager is currently in review mode (persisted across reloads). */
export const isReviewModeActive = (): boolean => sessionStore.read(REVIEW_MODE_SESSION_KEY) === '1';

export const markReviewModeActive = (): void => {
  sessionStore.write(REVIEW_MODE_SESSION_KEY, '1');
};

const readJson = <T>(key: string): T | null => {
  const raw = sessionStore.read(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Collapse sidebar/panel once per browser session and snapshot pre-review chrome. */
export const initializeSessionChromeIfNeeded = (api: ReviewModeApi): void => {
  if (sessionStore.read(CHROME_INITIALIZED_SESSION_KEY) === '1') {
    return;
  }

  sessionStore.write(
    CHROME_SNAPSHOT_SESSION_KEY,
    JSON.stringify({
      nav: api.getIsNavShown(),
      panel: api.getIsPanelShown(),
    })
  );
  sessionStore.write(CHROME_INITIALIZED_SESSION_KEY, '1');

  api.toggleNav(false);
  api.togglePanel(false);
};

/** Snapshot sidebar filters once per browser session (no narrowing). */
export const initializeSessionFiltersIfNeeded = (
  api: ReviewModeApi,
  filters: ReviewModeFilters
): void => {
  if (sessionStore.read(FILTERS_SNAPSHOT_SESSION_KEY) !== null) {
    return;
  }

  sessionStore.write(FILTERS_SNAPSHOT_SESSION_KEY, JSON.stringify(filters));
};

/** Narrow the sidebar to reviewing stories only. */
export const applyReviewingFilters = async (api: ReviewModeApi): Promise<void> => {
  await api.setAllTagFilters([], []);
  await api.setAllStatusFilters([REVIEWING_STATUS_VALUE], []);
};

/**
 * On review summary visit: apply the reviewing filter when this review has not
 * been filtered yet (first visit or a new review payload).
 */
export const applyReviewingFiltersForReviewIfNeeded = async (
  api: ReviewModeApi,
  createdAt: number | undefined
): Promise<void> => {
  if (createdAt === undefined) {
    return;
  }

  const lastApplied = sessionStore.read(LAST_FILTER_APPLIED_CREATED_AT_KEY);
  if (lastApplied === String(createdAt)) {
    return;
  }

  await applyReviewingFilters(api);
  sessionStore.write(LAST_FILTER_APPLIED_CREATED_AT_KEY, String(createdAt));
};

/**
 * Exit review mode: restore the chrome and filters captured on the first
 * review-page visit this session and clear the persisted review-mode flag.
 */
export const exitReviewMode = async (api: ReviewModeApi): Promise<void> => {
  const chrome = readJson<{ nav: boolean; panel: boolean }>(CHROME_SNAPSHOT_SESSION_KEY);
  if (chrome?.nav) {
    api.toggleNav(true);
  }
  if (chrome?.panel) {
    api.togglePanel(true);
  }

  const filters = readJson<ReviewModeFilters>(FILTERS_SNAPSHOT_SESSION_KEY);
  if (filters) {
    await api.setAllTagFilters(filters.includedTagFilters, filters.excludedTagFilters);
    await api.setAllStatusFilters(filters.includedStatusFilters, filters.excludedStatusFilters);
  }

  sessionStore.remove(REVIEW_MODE_SESSION_KEY);
  sessionStore.remove(LAST_FILTER_APPLIED_CREATED_AT_KEY);
  sessionStore.remove(CHROME_SNAPSHOT_SESSION_KEY);
  sessionStore.remove(FILTERS_SNAPSHOT_SESSION_KEY);
};
