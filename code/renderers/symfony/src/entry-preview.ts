import type { Parameters } from './types.ts';

export const tags = ['autodocs'];

export const parameters: Parameters = { renderer: 'symfony' };

export { render, renderToCanvas } from './render.ts';
