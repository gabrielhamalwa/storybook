import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static values = {
    variant: { type: String, default: 'primary' },
  };

  connect() {
    this.element.setAttribute('data-connected', 'true');
  }

  disconnect() {
    this.element.removeAttribute('data-connected');
  }

  click() {
    this.element.setAttribute('data-clicked', 'true');
  }
}
