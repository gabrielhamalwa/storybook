import { Application } from '@hotwired/stimulus';
import { registerControllers } from 'vite-plugin-symfony/stimulus/helpers';

const app = Application.start();

registerControllers(
  app,
  import.meta.glob('./controllers/*_controller.js', {
    query: '?stimulus',
    eager: true,
  })
);
