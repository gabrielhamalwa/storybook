import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { REVIEW_STATUS_TYPE_ID } from 'storybook/internal/types';

import { Location, MemoryRouter, parsePath, queryFromLocation } from 'storybook/internal/router';
import { ManagerContext, internal_fullStatusStore } from 'storybook/manager-api';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { ReviewProvider } from '../review/components/ReviewProvider.tsx';
import { REVIEW_COLLECTION_QUERY_PARAM, isReviewSummaryPath } from '../review/review-navigation.ts';
import { reviewStore } from '../review/review-store.ts';
import { ReviewWidget } from './ReviewWidget.tsx';

const REVIEW_ADDON_ID = 'storybook/review';
const DISPLAY_REVIEW = `${REVIEW_ADDON_ID}/display-review`;
const REQUEST_REVIEW = `${REVIEW_ADDON_ID}/request-review`;
const DISMISS_REVIEW = `${REVIEW_ADDON_ID}/dismiss-review`;

type EventListener = (payload?: unknown) => void;

const eventListeners = new Map<string, Set<EventListener>>();
const removeEventListener = (eventName: string, listener: EventListener) => {
  eventListeners.get(eventName)?.delete(listener);
};

const setReviewingStatuses = (storyIds: string[]) => {
  internal_fullStatusStore.set(
    storyIds.map((storyId) => ({
      storyId,
      typeId: REVIEW_STATUS_TYPE_ID,
      value: 'status-value:reviewing',
      title: 'Review',
      description: '',
    }))
  );
  return () => internal_fullStatusStore.unset();
};

const buildIndexEntries = (storyIds: string[]) =>
  storyIds.reduce<Record<string, any>>((acc, id) => {
    acc[id] = {
      type: 'story',
      id,
      name: id,
      title: id,
      importPath: `./${id}.stories.tsx`,
      tags: ['dev'],
    };
    return acc;
  }, {});

const buildReviewPayload = (reviewTitle: string, storyIds: string[], createdAt = Date.now()) => ({
  title: reviewTitle,
  description: '',
  createdAt,
  collections: storyIds.map((storyId) => ({
    title: 'Collection',
    rationale: '',
    storyIds: [storyId],
  })),
});

const makeManagerContext = (
  options: {
    path?: string;
    viewMode?: string;
    customQueryParams?: Record<string, string>;
    storyIds?: string[];
    reviewTitle?: string;
    reviewCreatedAt?: number;
    navigate?: ReturnType<typeof fn>;
    toggleNav?: ReturnType<typeof fn>;
    togglePanel?: ReturnType<typeof fn>;
    setAllTagFilters?: ReturnType<typeof fn>;
    setAllStatusFilters?: ReturnType<typeof fn>;
    setQueryParams?: ReturnType<typeof fn>;
    emit?: ReturnType<typeof fn>;
    on?: ReturnType<typeof fn>;
    off?: ReturnType<typeof fn>;
  } = {}
): any => {
  const on =
    options.on ??
    fn((eventName: string, listener: EventListener): (() => void) => {
      if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, new Set());
      }
      eventListeners.get(eventName)?.add(listener);
      return () => removeEventListener(eventName, listener);
    }).mockName('api::on');

  const emit =
    options.emit ??
    fn((eventName: string, payload?: unknown) => {
      if (eventName === REQUEST_REVIEW && options.reviewTitle) {
        const review = buildReviewPayload(
          options.reviewTitle,
          options.storyIds ?? [],
          options.reviewCreatedAt
        );
        eventListeners.get(DISPLAY_REVIEW)?.forEach((listener) => {
          listener(review);
        });
      }
      eventListeners.get(eventName)?.forEach((listener) => {
        listener(payload);
      });
    }).mockName('api::emit');

  return {
    state: {
      path: options.path ?? '/',
      viewMode: options.viewMode ?? 'story',
      customQueryParams: options.customQueryParams ?? {},
      internal_index: {
        v: 5,
        entries: buildIndexEntries(options.storyIds ?? []),
      },
      docsOptions: {
        defaultName: 'Docs',
        autodocs: 'tag',
        docsMode: false,
      },
    },
    api: {
      on,
      off: options.off ?? fn().mockName('api::off'),
      once: fn().mockName('api::once'),
      emit,
      getIsNavShown: () => true,
      getIsPanelShown: () => true,
      toggleNav: options.toggleNav ?? fn().mockName('api::toggleNav'),
      togglePanel: options.togglePanel ?? fn().mockName('api::togglePanel'),
      setAllTagFilters: options.setAllTagFilters ?? fn().mockName('api::setAllTagFilters'),
      setAllStatusFilters: options.setAllStatusFilters ?? fn().mockName('api::setAllStatusFilters'),
      setQueryParams: options.setQueryParams ?? fn().mockName('api::setQueryParams'),
      getStoryHrefs: (storyId: string) => ({
        managerHref: `?path=/story/${storyId}`,
        previewHref: `iframe.html?id=${storyId}&viewMode=story`,
      }),
      addNotification: fn().mockName('api::addNotification'),
      clearNotification: fn().mockName('api::clearNotification'),
      getUrlState: () => ({
        path: options.path ?? '/',
        queryParams: options.customQueryParams ?? {},
      }),
      navigate: options.navigate ?? fn().mockName('api::navigate'),
    },
  };
};

const buildInitialEntry = (contextOptions?: Parameters<typeof makeManagerContext>[0]) => {
  const path = contextOptions?.path ?? '/';
  const params = new URLSearchParams(contextOptions?.customQueryParams ?? {});
  return params.size ? `${path}?${params.toString()}` : path;
};

const deriveViewMode = (path: string): string => {
  if (path.startsWith('/story/') || path.startsWith('/docs/')) {
    return parsePath(path).viewMode ?? 'story';
  }
  if (isReviewSummaryPath(path)) {
    return 'review';
  }
  return 'story';
};

/** Keep ManagerContext path/viewMode in sync with MemoryRouter navigations in play tests. */
const ManagerStateSync = ({
  children,
  contextOptions = {},
}: {
  children: React.ReactNode;
  contextOptions?: Parameters<typeof makeManagerContext>[0];
}) => (
  <Location>
    {({ location, path }) => {
      const query = queryFromLocation(location);
      const customQueryParams: Record<string, string> = {};
      if (query[REVIEW_COLLECTION_QUERY_PARAM] !== undefined) {
        customQueryParams[REVIEW_COLLECTION_QUERY_PARAM] = String(
          query[REVIEW_COLLECTION_QUERY_PARAM]
        );
      }

      return (
        <ManagerContext.Provider
          value={makeManagerContext({
            ...contextOptions,
            path,
            viewMode: deriveViewMode(path),
            customQueryParams,
          })}
        >
          <span data-testid="router-path" hidden>
            {path}
          </span>
          {children}
        </ManagerContext.Provider>
      );
    }}
  </Location>
);

const meta = {
  component: ReviewWidget,
  title: 'Sidebar/ReviewWidget',
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={[buildInitialEntry(parameters?.contextOptions)]}>
        <ManagerStateSync contextOptions={parameters?.contextOptions ?? {}}>
          <ReviewProvider>
            <div style={{ padding: '8px', width: '280px' }}>
              <Story />
            </div>
          </ReviewProvider>
        </ManagerStateSync>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ReviewWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

export const Default: Story = {
  parameters: {
    contextOptions: {
      storyIds,
      reviewTitle: 'Button style changes on Shop screen',
    },
  },
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    return setReviewingStatuses(storyIds);
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Quick review')).toBeVisible();
    await expect(canvas.getByText('Review 12 stories')).toBeVisible();
    await expect(canvas.findByText('Button style changes on Shop screen')).resolves.toBeVisible();
  },
};

export const SingleStory: Story = {
  parameters: {
    contextOptions: {
      storyIds: ['s1'],
      reviewTitle: 'Primary button visual refresh',
    },
  },
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    return setReviewingStatuses(['s1']);
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Review 1 story')).toBeVisible();
    await expect(canvas.findByText('Primary button visual refresh')).resolves.toBeVisible();
  },
};

export const HiddenWhenZeroCounts: Story = {
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    internal_fullStatusStore.unset();
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Quick review')).toBeNull();
  },
};

const navigateMock = fn().mockName('api::navigate');
const setQueryParamsMock = fn().mockName('api::setQueryParams');
const toggleNavMock = fn().mockName('api::toggleNav');
const togglePanelMock = fn().mockName('api::togglePanel');
const setAllTagFiltersMock = fn().mockName('api::setAllTagFilters');
const setAllStatusFiltersMock = fn().mockName('api::setAllStatusFilters');

export const OpenReview: Story = {
  parameters: {
    contextOptions: {
      storyIds: ['s1', 's2'],
      reviewTitle: 'Theme token cascade review',
      navigate: navigateMock,
      setQueryParams: setQueryParamsMock,
      toggleNav: toggleNavMock,
      togglePanel: togglePanelMock,
      setAllTagFilters: setAllTagFiltersMock,
      setAllStatusFilters: setAllStatusFiltersMock,
    },
  },
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    sessionStorage.clear();
    navigateMock.mockClear();
    setQueryParamsMock.mockClear();
    toggleNavMock.mockClear();
    togglePanelMock.mockClear();
    setAllTagFiltersMock.mockClear();
    setAllStatusFiltersMock.mockClear();
    return setReviewingStatuses(['s1', 's2']);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Review 2 stories/i }));
    await expect(setQueryParamsMock).toHaveBeenCalledWith({
      [REVIEW_COLLECTION_QUERY_PARAM]: null,
    });
    await waitFor(() => {
      expect(canvas.getByTestId('router-path')).toHaveTextContent('/review/');
      expect(toggleNavMock).toHaveBeenCalledWith(false);
      expect(togglePanelMock).toHaveBeenCalledWith(false);
      expect(setAllTagFiltersMock).toHaveBeenCalledWith([], []);
      expect(setAllStatusFiltersMock).toHaveBeenCalledWith(['status-value:reviewing'], []);
    });
  },
};

const dismissEmitMock = fn((eventName: string, payload?: unknown) => {
  if (eventName === REQUEST_REVIEW) {
    eventListeners.get(DISPLAY_REVIEW)?.forEach((listener) => {
      listener(buildReviewPayload('Button prop rename', ['s1']));
    });
  }
  eventListeners.get(eventName)?.forEach((listener) => {
    listener(payload);
  });
}).mockName('api::emit');

export const DismissReview: Story = {
  parameters: {
    contextOptions: {
      storyIds: ['s1'],
      reviewTitle: 'Button prop rename',
      emit: dismissEmitMock,
    },
  },
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    dismissEmitMock.mockClear();
    return setReviewingStatuses(['s1']);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss review' }));
    await expect(dismissEmitMock).toHaveBeenCalledWith(DISMISS_REVIEW);
  },
};

const INITIAL_CREATED_AT = new Date().getTime() - 100_000;

export const KeepsDisplayedTitleDuringPendingUpdate: Story = {
  parameters: {
    contextOptions: {
      storyIds: ['s1', 's2'],
      reviewTitle: 'First review title',
      reviewCreatedAt: INITIAL_CREATED_AT,
    },
  },
  beforeEach: () => {
    reviewStore.reset();
    eventListeners.clear();
    sessionStorage.clear();
    return setReviewingStatuses(['s1', 's2']);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('First review title')).toBeVisible();

    eventListeners.get(DISPLAY_REVIEW)?.forEach((listener) => {
      listener(
        buildReviewPayload('Updated review title', ['s1', 's2'], INITIAL_CREATED_AT + 60_000)
      );
    });

    await expect(canvas.getByText('First review title')).toBeVisible();
    expect(canvas.queryByText('Updated review title')).toBeNull();
  },
};
