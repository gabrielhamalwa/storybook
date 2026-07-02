import type { WebRenderer } from 'storybook/internal/types';

export type { RenderContext } from 'storybook/internal/types';

export interface StoryFnSymfonyReturnType {
  componentId?: string;
}

export interface ShowErrorArgs {
  title: string;
  description: string;
}

export interface SymfonyRenderer extends WebRenderer {
  component: string;
  storyResult: StoryFnSymfonyReturnType;
}

export interface Parameters {
  renderer: 'symfony';
  symfony?: {
    serverUrl?: string;
    environment?: string;
    adapter?: 'twig_component' | 'template' | 'controller' | 'live';
    template?: string;
    controller?: string;
    live?: boolean;
  };
}
