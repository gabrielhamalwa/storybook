import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';

import { useNavigate } from 'storybook/internal/router';
import type { StatusesByStoryIdAndTypeId } from 'storybook/internal/types';
import { REVIEW_STATUS_TYPE_ID } from 'storybook/internal/types';
import {
  experimental_getStatusStore,
  experimental_useStatusStore,
  useChannel,
  useStorybookApi,
  useStorybookState,
} from 'storybook/manager-api';

import { AUTO_ENTERED_SESSION_KEY, EVENTS, PRE_REVIEW_RETURN_KEY } from '../constants.ts';
import { beginReviewCycle, capturePreReviewReturn } from '../review-entry.ts';
import { navigateOutOfReview } from '../review-actions.ts';
import {
  applyReviewingFiltersForReviewIfNeeded,
  initializeSessionChromeIfNeeded,
  initializeSessionFiltersIfNeeded,
  isReviewModeActive,
  markReviewModeActive,
} from '../review-mode.ts';
import {
  REVIEW_COLLECTION_QUERY_PARAM,
  buildFlattenedNavEntries,
  buildReviewChangesSummaryHref,
  isReviewSummaryPath,
  parseCollectionIndex,
  parseStoryIdFromPath,
  resolveActiveNavEntry,
  resolveNavIndex,
} from '../review-navigation.ts';
import {
  acceptReviewNotification,
  clearReviewNotificationsOnDismiss,
} from '../review-notification.ts';
import type { ReviewState } from '../review-state.ts';
import {
  clearReviewStatuses,
  collectReviewStoryIds,
  syncReviewStatuses,
} from '../review-status.ts';
import { reviewNotificationKey, reviewStore, type ReviewStoreState } from '../review-store.ts';
import { buildNewlyAddedStoryIds, buildStoryInfo } from '../review-story-info.ts';
import { sessionStore } from '../session-store.ts';
import { useReviewFiltersRef } from '../useReviewFiltersRef.ts';

const reviewStatusStore = experimental_getStatusStore(REVIEW_STATUS_TYPE_ID);

const isDeferredReviewUpdate = (current: ReviewState | null, next: ReviewState): boolean =>
  current !== null &&
  current.createdAt !== undefined &&
  next.createdAt !== undefined &&
  current.createdAt !== next.createdAt;

export const ReviewProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ReviewState | null>(null);
  const [pendingReview, setPendingReview] = useState<ReviewState | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isInReviewMode, setIsInReviewMode] = useState(() => isReviewModeActive());
  const previousReviewStoryIdsRef = useRef<Set<string>>(new Set());
  const displayedReviewRef = useRef<ReviewState | null>(null);
  displayedReviewRef.current = state;

  const api = useStorybookApi();
  const navigate = useNavigate();
  const { index, path, customQueryParams, location } = useStorybookState();

  const collectionParam = customQueryParams?.[REVIEW_COLLECTION_QUERY_PARAM] as string | undefined;

  const filtersRef = useReviewFiltersRef();

  const onReviewSummaryVisit = useCallback(async () => {
    initializeSessionChromeIfNeeded(api);
    initializeSessionFiltersIfNeeded(api, filtersRef.current);
    await applyReviewingFiltersForReviewIfNeeded(api, state?.createdAt);
  }, [api, filtersRef, state?.createdAt]);

  const getStoryPreviewHref = useCallback(
    (storyId: string) => api.getStoryHrefs(storyId, { freeze: true }).previewHref,
    [api]
  );

  const emit = useChannel({
    [EVENTS.DISPLAY_REVIEW]: (next: ReviewState) => {
      const current = displayedReviewRef.current;
      if (isDeferredReviewUpdate(current, next)) {
        setPendingReview(next);
        reviewStore.setState(reviewStore.getState(), next);
        return;
      }
      setPendingReview(null);
      sessionStore.remove(AUTO_ENTERED_SESSION_KEY);
      setState(next);
      setIsStale(!!next.stale);
    },
    [EVENTS.REVIEW_STALE]: () => {
      setIsStale(true);
    },
    [EVENTS.REVIEW_DISMISSED]: (returnSearch?: string | null) => {
      clearReviewStatuses(reviewStatusStore);
      previousReviewStoryIdsRef.current = new Set();
      sessionStore.remove(AUTO_ENTERED_SESSION_KEY);
      clearReviewNotificationsOnDismiss(
        api,
        reviewStore.getState().state,
        reviewStore.getPendingReview()
      );
      setState(null);
      setPendingReview(null);
      setIsStale(false);
      setIsInReviewMode(false);
      navigateOutOfReview(api, navigate, returnSearch);
    },
  });

  const dismissReview = useCallback(() => {
    const returnSearch = sessionStore.read(PRE_REVIEW_RETURN_KEY);
    emit(EVENTS.DISMISS_REVIEW, returnSearch);
  }, [emit]);

  const acceptPendingReview = useCallback(() => {
    const accepted = reviewStore.getPendingReview();
    if (!accepted) {
      return;
    }
    acceptReviewNotification(api, accepted.createdAt);
    reviewStore.setState(reviewStore.getState(), null);
    setState(accepted);
    setIsStale(!!accepted.stale);
    setPendingReview(null);
    sessionStore.remove(AUTO_ENTERED_SESSION_KEY);
    if (!isReviewModeActive()) {
      capturePreReviewReturn(location?.search ?? window.location.search);
      beginReviewCycle();
      setIsInReviewMode(true);
    }
    navigate(buildReviewChangesSummaryHref(), { plain: true });
  }, [api, location?.search, navigate]);

  useEffect(() => {
    emit(EVENTS.REQUEST_REVIEW);
  }, [emit]);

  useEffect(() => {
    if (!state) {
      return;
    }
    const storyIds = collectReviewStoryIds(state);
    previousReviewStoryIdsRef.current = syncReviewStatuses(
      reviewStatusStore,
      storyIds,
      previousReviewStoryIdsRef.current
    );
  }, [state]);

  const flattenedEntries = useMemo(() => (state ? buildFlattenedNavEntries(state) : []), [state]);

  const allStatuses = experimental_useStatusStore() as StatusesByStoryIdAndTypeId;
  const newlyAddedStoryIds = useMemo(
    () => (state ? buildNewlyAddedStoryIds(state, allStatuses) : new Set<string>()),
    [allStatuses, state]
  );

  const storyInfo = useMemo(
    () => (state ? buildStoryInfo(state, index, api, allStatuses, newlyAddedStoryIds) : {}),
    [allStatuses, api, index, newlyAddedStoryIds, state]
  );

  const collectionIndex = parseCollectionIndex(collectionParam);
  const storyIdFromPath = parseStoryIdFromPath(path);
  const activeEntry =
    state && storyIdFromPath
      ? resolveActiveNavEntry(flattenedEntries, storyIdFromPath, collectionIndex)
      : null;
  const activeIndex = activeEntry ? resolveNavIndex(flattenedEntries, activeEntry) : -1;

  const isSummaryVisible = isReviewSummaryPath(path);

  useEffect(() => {
    setIsInReviewMode(isReviewModeActive());
  }, [path, collectionParam]);

  useEffect(() => {
    if (!state || !isSummaryVisible) {
      return;
    }

    if (!isReviewModeActive()) {
      if (sessionStore.read(AUTO_ENTERED_SESSION_KEY) === '1') {
        return;
      }
      sessionStore.write(AUTO_ENTERED_SESSION_KEY, '1');
      capturePreReviewReturn(location?.search ?? window.location.search);
      markReviewModeActive();
      setIsInReviewMode(true);
    }

    void onReviewSummaryVisit();
  }, [state, isSummaryVisible, location?.search, onReviewSummaryVisit]);

  const value = useMemo<ReviewStoreState>(
    () => ({
      state,
      notificationKey: reviewNotificationKey(state, pendingReview),
      isStale,
      hasPendingUpdate: pendingReview !== null,
      onAcceptPendingUpdate: acceptPendingReview,
      storyInfo,
      flattenedEntries,
      newlyAddedStoryIds,
      activeEntry,
      activeIndex,
      isInReviewMode,
      isSummaryVisible,
      getStoryPreviewHref,
      dismissReview,
    }),
    [
      state,
      pendingReview,
      isStale,
      acceptPendingReview,
      storyInfo,
      flattenedEntries,
      newlyAddedStoryIds,
      activeEntry,
      activeIndex,
      isInReviewMode,
      isSummaryVisible,
      getStoryPreviewHref,
      dismissReview,
    ]
  );

  useLayoutEffect(() => {
    reviewStore.setState(value, pendingReview);
  }, [value, pendingReview]);

  useLayoutEffect(() => {
    if (isSummaryVisible) {
      reviewStore.releaseSummaryOverlaySuppression();
    }
  }, [isSummaryVisible]);

  return children;
};
