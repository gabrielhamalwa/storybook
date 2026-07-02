import { describe, expect, it, vi } from 'vitest';

import {
  createVirtualImportPath,
  fetchComponentIndex,
  generateCsfModule,
  isVirtualComponentImport,
  parseComponentIdFromVirtualImport,
  type ComponentMetadata,
} from './indexer.ts';

describe('indexer helpers', () => {
  describe('createVirtualImportPath', () => {
    it('returns a virtual import path for a component id', () => {
      expect(createVirtualImportPath('Button')).toBe('virtual:storybook-symfony-component/Button');
    });
  });

  describe('isVirtualComponentImport', () => {
    it('returns true for virtual component imports', () => {
      expect(isVirtualComponentImport('virtual:storybook-symfony-component/Button')).toBe(true);
    });

    it('returns false for regular imports', () => {
      expect(isVirtualComponentImport('./Button.stories.ts')).toBe(false);
    });
  });

  describe('parseComponentIdFromVirtualImport', () => {
    it('extracts the component id from a virtual import', () => {
      expect(parseComponentIdFromVirtualImport('virtual:storybook-symfony-component/Button')).toBe(
        'Button'
      );
    });

    it('returns undefined for non-virtual imports', () => {
      expect(parseComponentIdFromVirtualImport('./Button.stories.ts')).toBeUndefined();
    });
  });

  describe('generateCsfModule', () => {
    it('generates a CSF module for a Twig component', () => {
      const component: ComponentMetadata = {
        id: 'Button',
        type: 'twig_component',
        title: 'Components/Button',
        template: 'templates/components/Button.html.twig',
        class: 'App\\Twig\\Components\\Button',
        props: [
          { name: 'label', type: 'string', required: false, default: 'Button' },
          { name: 'variant', type: 'string', required: false, default: 'primary' },
        ],
      };

      const source = generateCsfModule(component);

      expect(source).toContain('title: "Components/Button"');
      expect(source).toContain('component: "Button"');
      expect(source).toContain('autoDiscovered: true');
      expect(source).toContain('export const Default');
      expect(source).toContain('"label": "Button"');
      expect(source).toContain('"variant": "primary"');
    });

    it('generates a CSF module for a live component', () => {
      const component: ComponentMetadata = {
        id: 'LiveButton',
        type: 'live_component',
        title: 'Components/LiveButton',
        template: 'templates/components/LiveButton.html.twig',
        class: 'App\\Twig\\Components\\LiveButton',
        props: [],
      };

      const source = generateCsfModule(component);

      expect(source).toContain("adapter: 'live'");
    });
  });

  describe('fetchComponentIndex', () => {
    it('returns components from the Symfony index endpoint', async () => {
      const components: ComponentMetadata[] = [
        {
          id: 'Button',
          type: 'twig_component',
          title: 'Components/Button',
          template: 'templates/components/Button.html.twig',
          class: 'App\\Twig\\Components\\Button',
          props: [],
        },
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ components }),
        } as Response)
      );

      const result = await fetchComponentIndex('http://localhost:9999');

      expect(result).toEqual(components);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:9999/_storybook/index');

      vi.unstubAllGlobals();
    });

    it('returns an empty array after retries fail', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

      const result = await fetchComponentIndex('http://localhost:9999', {
        retries: 1,
        retryDelayMs: 10,
      });

      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });
  });
});
