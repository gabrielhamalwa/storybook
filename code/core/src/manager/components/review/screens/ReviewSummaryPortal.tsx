import React, { useLayoutEffect, useRef, useState, useSyncExternalStore, type FC } from 'react';
import { createPortal } from 'react-dom';

import { styled } from 'storybook/theming';

import { PRE_REVIEW_RETURN_KEY } from '../constants.ts';
import { reviewStore, useReview } from '../review-store.ts';
import { sessionStore } from '../session-store.ts';
import { SummaryScreen } from './SummaryScreen.tsx';

const LEGACY_PORTAL_HOST_ID = 'storybook-review-summary-portal';

const useSummaryOverlayShown = () =>
  useSyncExternalStore(
    reviewStore.subscribe,
    () => reviewStore.isSummaryOverlayShown(),
    () => reviewStore.isSummaryOverlayShown()
  );

// One stable host for the portal: never reparented, never display:none. While a
// reviewed story is open the host is parked off-screen so thumbnail iframes
// keep their documents alive. The summary is always edge-to-edge — it never
// shares space with sidebar or addon panel chrome.
const SummaryHost = styled.div<{ $visible: boolean }>(({ $visible }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
  position: 'fixed',
  top: 0,
  ...($visible
    ? {
        visibility: 'visible',
        pointerEvents: 'auto',
        zIndex: 2,
        left: 0,
        right: 0,
        bottom: 0,
      }
    : {
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
        left: '-10000px',
        right: 0,
        bottom: 0,
        width: '100vw',
      }),
}));

export const ReviewSummaryPortal: FC = () => {
  const {
    state,
    storyInfo,
    isStale,
    hasPendingUpdate,
    onAcceptPendingUpdate,
    getStoryPreviewHref,
    dismissReview,
    isInReviewMode,
    isSummaryVisible,
  } = useReview();
  const overlayShown = useSummaryOverlayShown();
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    document.getElementById(LEGACY_PORTAL_HOST_ID)?.remove();
  }, []);

  useLayoutEffect(() => {
    const node = hostRef.current;
    if (node) {
      node.inert = !overlayShown;
    }
  }, [overlayShown, portalHost]);

  if (!isSummaryVisible && !isInReviewMode) {
    return null;
  }

  return (
    <>
      <SummaryHost
        ref={(node) => {
          hostRef.current = node;
          setPortalHost(node);
        }}
        $visible={overlayShown}
        aria-hidden={!overlayShown}
        data-review-summary={overlayShown ? 'visible' : 'hidden'}
      />
      {portalHost &&
        createPortal(
          <SummaryScreen
            state={state}
            storyInfo={storyInfo}
            getStoryPreviewHref={getStoryPreviewHref}
            isStale={isStale && !hasPendingUpdate}
            hasPendingUpdate={hasPendingUpdate}
            onAcceptPendingUpdate={onAcceptPendingUpdate}
            previewsPaused={!overlayShown}
            onDismiss={dismissReview}
            returnSearch={sessionStore.read(PRE_REVIEW_RETURN_KEY)}
          />,
          portalHost
        )}
    </>
  );
};
