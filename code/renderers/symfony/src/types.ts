import type { StoryContext, WebRenderer } from 'storybook/internal/types';

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

export interface SymfonyParameters {
  serverUrl?: string;
  environment?: string;
  adapter?: 'template' | 'controller' | 'live';
  template?: string;
  controller?: string;
  live?: boolean;
  autoDiscovered?: boolean;
}

export interface Parameters {
  renderer: 'symfony';
  symfony?: SymfonyParameters;
  docs?: {
    source?: {
      type?: string;
      language?: string;
      code?: string;
      transform?: (
        code: string,
        context: Pick<StoryContext<SymfonyRenderer>, 'args' | 'component' | 'parameters'>
      ) => string | Promise<string>;
    };
  };
}
