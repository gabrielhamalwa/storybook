import { expect, test } from '@playwright/test';

const storyUrl = (storyId: string) => `/?path=/story/${storyId}`;

test.describe('Symfony/Twig kitchen sink', () => {
  test('Button/Primary renders the expected Twig component', async ({ page }) => {
    await page.goto(storyUrl('kitchen-sink-button--primary'));
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const button = iframe.locator('#storybook-root button');

    await expect(button).toHaveText('Primary Button');
    await expect(button).toHaveClass(/btn-primary/);
  });

  test('changing a control updates the rendered HTML', async ({ page }) => {
    await page.goto(storyUrl('kitchen-sink-button--primary'));
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const button = iframe.locator('#storybook-root button');

    await expect(button).toHaveText('Primary Button');

    await page.locator('textarea#control-label').fill('Updated Label');
    await expect(button).toHaveText('Updated Label');
  });

  test('Clickable play function clicks the Stimulus-controlled button', async ({ page }) => {
    await page.goto(storyUrl('kitchen-sink-button--clickable'));
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const button = iframe.locator('#storybook-root button');

    await expect(button).toHaveAttribute('data-connected', 'true');
    await expect(button).toHaveAttribute('data-clicked', 'true');
  });

  test('docs page shows the Twig source', async ({ page }) => {
    await page.goto('/?path=/docs/kitchen-sink-button--docs');
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    await expect(iframe.locator('body')).toContainText('data-controller="button"');
    await expect(iframe.locator('body')).toContainText('{{ label }}');
  });

  test('auto-discovered component appears in the sidebar', async ({ page }) => {
    await page.goto('/?path=/story/kitchen-sink-button--primary');
    const sidebar = page.locator('nav');
    await expect(sidebar).toContainText('Components');
    await expect(sidebar).toContainText('Button');
  });
});
