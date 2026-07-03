import { describe, expect, it } from 'vitest';

import { parameters, tags } from './entry-preview.ts';

describe('entry-preview', () => {
  it('enables autodocs by default', () => {
    expect(tags).toEqual(['autodocs']);
  });

  it('exports the symfony renderer parameter', () => {
    expect(parameters).toMatchObject({ renderer: 'symfony' });
  });
});
