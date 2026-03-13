import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { authenticator } from 'otplib';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const totpSecret = process.env.E2E_TOTP_SECRET;
const renewEmail = process.env.E2E_RENEW_EMAIL;
const allowMutations = process.env.E2E_ALLOW_MUTATIONS === 'true';
const hasLoginCreds = Boolean(email && password);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loginAndSettle = async (page: Page) => {
  if (!hasLoginCreds) {
    test.skip(true, 'Set E2E_EMAIL and E2E_PASSWORD to run smoke tests.');
  }

  await page.goto('/');
  const signInButton = page.getByRole('button', { name: /^Sign In$/ });
  if (await signInButton.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await signInButton.click();
  }

  const mfaHeading = page.getByRole('heading', { name: /Multi-Factor Authentication Required/i });
  if (await mfaHeading.isVisible({ timeout: 4_000 }).catch(() => false)) {
    if (!totpSecret) {
      test.skip(true, 'MFA is required for this account. Set E2E_TOTP_SECRET to continue.');
    }
    authenticator.options = { step: 30, window: 1 };
    const code = authenticator.generate(totpSecret!);
    await page.getByLabel('Authenticator Code').fill(code);
    await page.getByRole('button', { name: /Verify & Continue/i }).click();
  }

  await expect(page.getByTestId('export-menu-trigger')).toBeVisible({ timeout: 30_000 });
};

const ensureProjectExists = async (page: Page) => {
  const createHeading = page.getByRole('heading', { name: /Create Your First Project/i });
  if (await createHeading.isVisible({ timeout: 2_500 }).catch(() => false)) {
    await page.getByRole('button', { name: /^New Project$/ }).click();
    await expect(page.getByRole('button', { name: /^Create Project$/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^Create Project$/ }).click();
  }
  await expect(page.getByTestId('export-menu-trigger')).toBeEnabled({ timeout: 20_000 });
};

test.describe('Dashboard smoke', () => {
  test('renders login shell without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Garza ROI Dashboard/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Sign in to access the calculator and analysis tools.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^Sign In$/ })).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('exports consolidated CSV', async ({ page }) => {
    await loginAndSettle(page);
    await ensureProjectExists(page);

    await page.getByTestId('export-menu-trigger').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-csv').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    await expect(page.getByText('CSV exported.')).toBeVisible({ timeout: 10_000 });
  });

  test('opens print/export PDF flow from current view', async ({ page }) => {
    await loginAndSettle(page);
    await ensureProjectExists(page);

    await page.getByTestId('export-menu-trigger').click();
    await page.getByTestId('export-pdf').click();
    await expect(page.getByText('Print dialog opened.')).toBeVisible({ timeout: 10_000 });
  });

  test('admin renew flow executes for configured smoke account', async ({ page }) => {
    test.skip(!allowMutations || !renewEmail, 'Set E2E_ALLOW_MUTATIONS=true and E2E_RENEW_EMAIL to run renew smoke.');

    await loginAndSettle(page);
    await page.getByRole('button', { name: /Approvals/i }).click();
    await expect(page.getByText('Quick Add')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('quick-add-email').fill(renewEmail!);
    await page.getByTestId('quick-add-renew-days').fill('1');
    await page.getByTestId('quick-add-approve').click();
    await expect(page.getByText(new RegExp(`Approved\\s+${escapeRegex(renewEmail!)}`, 'i'))).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId('approval-search').fill(renewEmail!);
    const row = page.locator('tr', { has: page.getByRole('cell', { name: renewEmail!, exact: true }) });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: /Renew \(\+1d\)/i }).click();
    await expect(page.getByText(new RegExp(`Renewed\\s+${escapeRegex(renewEmail!)}`, 'i'))).toBeVisible({
      timeout: 15_000,
    });
    await expect(row.getByText(/Active until/i)).toBeVisible({ timeout: 15_000 });
  });
});
