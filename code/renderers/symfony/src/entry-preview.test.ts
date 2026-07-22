import { describe, expect, it } from 'vitest';

import { parameters } from './entry-preview.ts';

describe('entry-preview', () => {
  it('exports the symfony renderer parameter', () => {
    expect(parameters).toMatchObject({ renderer: 'symfony' });
  });
});
