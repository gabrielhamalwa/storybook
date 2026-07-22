import type {
  AnnotatedStoryFn,
  Args,
  ComponentAnnotations,
  DecoratorFunction,
  StoryContext as GenericStoryContext,
  LoaderFunction,
  ProjectAnnotations,
  StoryAnnotations,
  StrictArgs,
} from 'storybook/internal/types';

import type { SymfonyParameters, SymfonyRenderer } from './types.ts';

export type { Args, ArgTypes, Parameters, StrictArgs } from 'storybook/internal/types';
export type { SymfonyParameters, SymfonyRenderer };

export type Meta<TArgs = Args> = ComponentAnnotations<SymfonyRenderer, TArgs> & {
  autodocs?: boolean;
};

export type StoryFn<TArgs = Args> = AnnotatedStoryFn<SymfonyRenderer, TArgs>;

export type StoryObj<TArgs = Args> = StoryAnnotations<SymfonyRenderer, TArgs>;

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SymfonyRenderer, TArgs>;

export type Loader<TArgs = StrictArgs> = LoaderFunction<SymfonyRenderer, TArgs>;

export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SymfonyRenderer, TArgs>;

export type Preview = ProjectAnnotations<SymfonyRenderer>;
