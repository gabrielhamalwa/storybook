import { Category, StorybookError } from 'storybook/internal/server-errors';

export class SymfonyRendererError extends StorybookError {
  constructor(message: string) {
    super({
      category: Category.RENDERER_SYMFONY,
      code: 1,
      message,
      name: 'SymfonyRendererError',
    });
  }
}
