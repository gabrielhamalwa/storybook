import { Application } from '@hotwired/stimulus';
import ButtonController from './controllers/button_controller.js';

const application = Application.start();
application.debug = false;
application.register('button', ButtonController);
