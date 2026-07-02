import { StorybookError } from 'storybook/internal/server-errors';

export class SymfonyFrameworkError extends StorybookError {
  constructor(message: string) {
    super({
      category: 'FRAMEWORK_SYMFONY_VITE',
      code: 1,
      message,
      name: 'SymfonyFrameworkError',
    });
  }
}
