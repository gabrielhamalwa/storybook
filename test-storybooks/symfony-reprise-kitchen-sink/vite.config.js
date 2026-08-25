import Symfony from '@symfony/reprise/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    Symfony({
      stimulus: 'assets/controllers.json',
    }),
  ],
  build: {
    outDir: 'public/build',
    rollupOptions: {
      input: {
        app: './assets/app.js',
      },
    },
  },
});
