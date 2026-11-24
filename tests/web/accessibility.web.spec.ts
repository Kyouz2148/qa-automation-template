import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@fixtures/test.fixture.js';

test.describe('Accessibility Audits @web @a11y', () => {
  test('dashboard should have no critical or serious WCAG violations', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.open();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(severeViolations).toEqual([]);
  });

  test.describe('Unauthenticated views', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page should have no critical or serious WCAG violations', async ({
      page,
      loginPage,
    }) => {
      await loginPage.open();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const severeViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(severeViolations).toEqual([]);
    });
  });
});
