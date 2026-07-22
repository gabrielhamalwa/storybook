import { Application } from '@hotwired/stimulus';
import LiveController from '@symfony/ux-live-component';
import ButtonController from './controllers/button_controller.js';

const application = Application.start();
application.debug = false;
application.register('button', ButtonController);
application.register('live', LiveController);
