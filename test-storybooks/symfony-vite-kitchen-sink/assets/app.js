import { Application } from '@hotwired/stimulus';
import LiveController from '@symfony/ux-live-component/dist/live_controller.js';
import { registerControllers } from 'vite-plugin-symfony/stimulus/helpers';

const app = Application.start();
app.register('live', LiveController);

registerControllers(
  app,
  import.meta.glob('./controllers/*_controller.js', {
    query: '?stimulus',
    eager: true,
  })
);
