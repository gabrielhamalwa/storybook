// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusValue } from 'storybook/internal/types';

import {
  applyReviewingFiltersForReviewIfNeeded,
  exitReviewMode,
  initializeSessionChromeIfNeeded,
  initializeSessionFiltersIfNeeded,
  isReviewModeActive,
  markReviewModeActive,
  type ReviewModeFilters,
} from './review-mode.ts';

const emptyFilters: ReviewModeFilters = {
  includedStatusFilters: [],
  excludedStatusFilters: [],
  includedTagFilters: [],
  excludedTagFilters: [],
};

const makeApi = (
  overrides: Partial<{ getIsNavShown: () => boolean; getIsPanelShown: () => boolean }> = {}
) => ({
  toggleNav: vi.fn(),
  togglePanel: vi.fn(),
  getIsNavShown: () => true,
  getIsPanelShown: () => true,
  setAllStatusFilters: vi.fn(async () => {}),
  setAllTagFilters: vi.fn(async () => {}),
  ...overrides,
});

beforeEach(() => {
  sessionStorage.clear();
});

describe('initializeSessionChromeIfNeeded', () => {
  it('collapses chrome and snapshots visibility once per browser session', () => {
    const api = makeApi();
    initializeSessionChromeIfNeeded(api);
    initializeSessionChromeIfNeeded(api);

    expect(api.toggleNav).toHaveBeenCalledTimes(1);
    expect(api.toggleNav).toHaveBeenCalledWith(false);
    expect(api.togglePanel).toHaveBeenCalledTimes(1);
    expect(api.togglePanel).toHaveBeenCalledWith(false);
  });
});

describe('initializeSessionFiltersIfNeeded', () => {
  it('snapshots filters once per browser session without narrowing', async () => {
    const preReviewFilters: ReviewModeFilters = {
      includedStatusFilters: ['status-value:error' as StatusValue],
      excludedStatusFilters: [],
      includedTagFilters: ['play-fn'],
      excludedTagFilters: [],
    };
    const api = makeApi();
    initializeSessionFiltersIfNeeded(api, preReviewFilters);
    initializeSessionFiltersIfNeeded(api, emptyFilters);

    expect(api.setAllStatusFilters).not.toHaveBeenCalled();
    expect(api.setAllTagFilters).not.toHaveBeenCalled();

    await exitReviewMode(api);
    expect(api.setAllTagFilters).toHaveBeenCalledWith(['play-fn'], []);
    expect(api.setAllStatusFilters).toHaveBeenCalledWith(['status-value:error'], []);
  });
});

describe('applyReviewingFiltersForReviewIfNeeded', () => {
  it('applies the reviewing filter once per review createdAt', async () => {
    const api = makeApi();
    await applyReviewingFiltersForReviewIfNeeded(api, 100);
    await applyReviewingFiltersForReviewIfNeeded(api, 100);

    expect(api.setAllStatusFilters).toHaveBeenCalledTimes(1);
    expect(api.setAllStatusFilters).toHaveBeenCalledWith(['status-value:reviewing'], []);
  });

  it('re-applies when a new review arrives', async () => {
    const api = makeApi();
    await applyReviewingFiltersForReviewIfNeeded(api, 100);
    await applyReviewingFiltersForReviewIfNeeded(api, 200);

    expect(api.setAllStatusFilters).toHaveBeenCalledTimes(2);
  });
});

describe('markReviewModeActive', () => {
  it('persists the review-mode flag', () => {
    markReviewModeActive();
    expect(isReviewModeActive()).toBe(true);
  });
});

describe('exitReviewMode', () => {
  it('restores only the chrome that was shown before the first review visit', async () => {
    initializeSessionChromeIfNeeded(
      makeApi({ getIsNavShown: () => true, getIsPanelShown: () => false })
    );
    markReviewModeActive();

    const api = makeApi();
    await exitReviewMode(api);
    expect(api.toggleNav).toHaveBeenCalledWith(true);
    expect(api.togglePanel).not.toHaveBeenCalledWith(true);
    expect(isReviewModeActive()).toBe(false);
  });

  it('is inert when there is no snapshot to restore', async () => {
    const api = makeApi();
    await exitReviewMode(api);
    expect(api.toggleNav).not.toHaveBeenCalled();
    expect(isReviewModeActive()).toBe(false);
  });

  it('consumes snapshots so a later exit does not restore stale state', async () => {
    initializeSessionChromeIfNeeded(
      makeApi({ getIsNavShown: () => true, getIsPanelShown: () => true })
    );
    initializeSessionFiltersIfNeeded(makeApi(), {
      includedStatusFilters: ['status-value:error' as StatusValue],
      excludedStatusFilters: [],
      includedTagFilters: ['play-fn'],
      excludedTagFilters: [],
    });
    markReviewModeActive();

    const firstExitApi = makeApi();
    await exitReviewMode(firstExitApi);
    expect(firstExitApi.toggleNav).toHaveBeenCalledWith(true);

    const secondExitApi = makeApi();
    await exitReviewMode(secondExitApi);
    expect(secondExitApi.toggleNav).not.toHaveBeenCalled();
    expect(secondExitApi.setAllTagFilters).not.toHaveBeenCalled();
    expect(secondExitApi.setAllStatusFilters).not.toHaveBeenCalled();
  });
});
