import { global } from '@storybook/global';

export interface StimulusState {
  /** Disconnect Stimulus controllers in the canvas and prepare for new HTML. */
  disconnect: () => void;
  /** Connect Stimulus controllers after new HTML is in the canvas. */
  connect: () => void;
}

export function manageStimulus(): StimulusState {
  return {
    disconnect: () => {
      dispatchEvent(document, 'stimulus:disconnect');
    },
    connect: () => {
      simulateDOMContentLoaded(document);
    },
  };
}

function dispatchEvent(target: Document, type: string): void {
  const event = global.document.createEvent('Event');
  event.initEvent(type, true, true);
  target.dispatchEvent(event);
}

function simulateDOMContentLoaded(target: Document): void {
  const event = global.document.createEvent('Event');
  event.initEvent('DOMContentLoaded', true, true);
  target.dispatchEvent(event);

  if (global.window) {
    const windowEvent = global.document.createEvent('Event');
    windowEvent.initEvent('DOMContentLoaded', true, true);
    global.window.dispatchEvent(windowEvent);
  }
}
