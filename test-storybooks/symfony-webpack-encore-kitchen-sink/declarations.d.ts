declare module '@storybook/symfony' {
  export type Meta<TArgs = any> = any;
  export type StoryObj<TArgs = any> = any;
  export type StoryFn<TArgs = any> = any;
  export type Decorator<TArgs = any> = any;
  export type StoryContext<TArgs = any> = any;
  export type Preview = any;
  export type Args = any;
  export type ArgTypes = any;
  export type Parameters = any;
  export type StrictArgs = any;
  export type SymfonyRenderer = any;
}

declare module 'storybook/test' {
  export const expect: any;
  export const userEvent: any;
  export function within(element: HTMLElement): any;
}
