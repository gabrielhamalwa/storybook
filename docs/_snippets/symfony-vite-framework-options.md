```ts filename=".storybook/main.ts" renderer="symfony" language="ts" tabTitle="CSF 3"
import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        environment: 'storybook',
        server: 'php',
        // port: 0,
        // projectDir: process.cwd(),
      },
    },
  },
};

export default config;
```

```ts filename=".storybook/main.ts" renderer="symfony" language="ts" tabTitle="CSF Next 🧪"
import { defineMain } from '@storybook/symfony-vite/node';

export default defineMain({
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        environment: 'storybook',
        server: 'php',
        // port: 0,
        // projectDir: process.cwd(),
      },
    },
  },
});
```
