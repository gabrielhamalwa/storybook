import { ProjectType } from 'storybook/internal/cli';
import { logger } from 'storybook/internal/node-logger';
import { SupportedBuilder, SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

import { defineGeneratorModule } from '../modules/GeneratorModule.ts';

export default defineGeneratorModule({
  metadata: {
    projectType: ProjectType.SYMFONY,
    renderer: SupportedRenderer.SYMFONY,
    framework: SupportedFramework.SYMFONY_VITE,
    builderOverride: SupportedBuilder.VITE,
  },
  configure: async () => ({
    extraPackages: ['vite'],
  }),
  postConfigure: () => {
    logger.info(
      'Symfony setup requires the companion bundle. Run: composer require --dev storybook/symfony-bundle'
    );
  },
});
