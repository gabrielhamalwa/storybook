```ts filename=".storybook/main.ts" renderer="symfony" language="ts" tabTitle="CSF 3"
import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  // ...
  framework: '@storybook/symfony-vite', // 👈 Add this
};

export default config;
```

```ts filename=".storybook/main.ts" renderer="symfony" language="ts" tabTitle="CSF Next 🧪"
import { defineMain } from '@storybook/symfony-vite/node';

export default defineMain({
  // ...
  framework: '@storybook/symfony-vite', // 👈 Add this
});
```
