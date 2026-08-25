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
  target.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

function simulateDOMContentLoaded(target: Document): void {
  target.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

  if (global.window) {
    global.window.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  }
}
