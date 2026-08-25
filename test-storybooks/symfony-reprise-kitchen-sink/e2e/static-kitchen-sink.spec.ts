import { expect, test, type Page } from '@playwright/test';

const storyUrl = (storyId: string) => `?path=/story/${storyId}`;
const INITIAL_RENDER_BUDGET_MS = 15_000;
const CONTROL_RERENDER_BUDGET_MS = 3_000;
const STATIC_RUNTIME_TIMEOUT_MS = 60_000;

const expectNoCspViolations = async (page: Page) => {
  const violations = (
    await Promise.all(
      page.frames().map((frame) =>
        frame.evaluate(() =>
          (globalThis as typeof globalThis & { __storybookCspViolations?: string[] })
            .__storybookCspViolations ?? []
        )
      )
    )
  ).flat();

  expect(violations).toEqual([]);
};

test.describe('static Symfony/Twig Storybook', () => {
  test.describe.configure({ timeout: STATIC_RUNTIME_TIMEOUT_MS });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const scope = globalThis as typeof globalThis & { __storybookCspViolations?: string[] };
      scope.__storybookCspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        scope.__storybookCspViolations?.push(`${event.effectiveDirective}: ${event.blockedURI}`);
      });
    });
  });

  test('renders and rerenders controls without a backend', async ({ page, browserName }) => {
    const initialRenderStartedAt = performance.now();
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(response.url());
      }
    });

    const response = await page.goto(storyUrl('kitchen-sink-button--primary'));
    expect(response?.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const button = iframe.locator('#storybook-root button');

    await expect(button).toHaveText('Primary Button', { timeout: STATIC_RUNTIME_TIMEOUT_MS });
    if (browserName === 'chromium') {
      expect(performance.now() - initialRenderStartedAt, 'initial static Symfony render').toBeLessThan(
        INITIAL_RENDER_BUDGET_MS
      );
    }
    await expect(button).toHaveClass(/btn-primary/);
    await expect(button).toHaveAttribute('data-connected', 'true', {
      timeout: STATIC_RUNTIME_TIMEOUT_MS,
    });

    const controlRerenderStartedAt = performance.now();
    await page.locator('textarea#control-label').fill('Static control value');
    await expect(button).toHaveText('Static control value');
    if (browserName === 'chromium') {
      expect(
        performance.now() - controlRerenderStartedAt,
        'static Symfony control rerender'
      ).toBeLessThan(CONTROL_RERENDER_BUDGET_MS);
    }

    const assetUrls = await iframe
      .locator('#storybook-symfony-assets [src], #storybook-symfony-assets [href]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('src') ?? element.getAttribute('href'))
      );
    expect(assetUrls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\/design-system\/build\/assets\/app-/),
      ])
    );
    expect(failedRequests).toEqual([]);
    await expectNoCspViolations(page);
  });

  test('executes Stimulus and Live Component interactions in the browser runtime', async ({
    page,
  }) => {
    await page.goto(storyUrl('kitchen-sink-button--clickable'));
    let iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const button = iframe.locator('#storybook-root button');
    await expect(button).toHaveAttribute('data-connected', 'true', {
      timeout: STATIC_RUNTIME_TIMEOUT_MS,
    });
    await button.click();
    await expect(button).toHaveAttribute('data-clicked', 'true');

    await page.goto(storyUrl('kitchen-sink-livecounter--default'));
    iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const count = iframe.locator('.live-count');

    await expect(count).toHaveText('0');
    await iframe.getByRole('button', { name: 'Increment' }).click();
    await expect(count).toHaveText('1');
    await expectNoCspViolations(page);
  });

  test('uploads files to Live Component actions in the browser runtime', async ({ page }) => {
    await page.goto(storyUrl('kitchen-sink-live-file-upload--default'));
    const iframe = page.locator('iframe#storybook-preview-iframe').contentFrame();
    const upload = iframe.locator('input[type="file"]');

    await upload.setInputFiles(
      {
        buffer: Buffer.from('Symfony static upload'),
        mimeType: 'text/plain',
        name: 'upload.txt',
      },
      { force: true }
    );
    await iframe.getByRole('button', { name: 'Upload' }).click();
    await expect(iframe.locator('.uploaded-file')).toHaveText('upload.txt: Symfony static upload');
    await expectNoCspViolations(page);
  });
});
