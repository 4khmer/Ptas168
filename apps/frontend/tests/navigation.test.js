import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('Bottom Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to Rooms tab', async ({ page }) => {
    const nav = page.locator('nav.bottom-nav');
    await nav.getByRole('link', { name: 'Room' }).click();
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
  });

  test('navigates to Tenants tab', async ({ page }) => {
    const nav = page.locator('nav.bottom-nav');
    await nav.getByRole('link', { name: 'Tenant' }).click();
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
  });

  test('navigates to Billing tab', async ({ page }) => {
    const nav = page.locator('nav.bottom-nav');
    await nav.getByRole('link', { name: 'Billing' }).click();
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  });

  test('navigates to More tab', async ({ page }) => {
    const nav = page.locator('nav.bottom-nav');
    await nav.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('heading', { name: 'More' })).toBeVisible();
  });

  test('active tab is highlighted in blue', async ({ page }) => {
    const nav = page.locator('nav.bottom-nav');
    await nav.getByRole('link', { name: 'Billing' }).click();
    const billingLink = page.locator('nav.bottom-nav a[href*="billing"]');
    await expect(billingLink).toHaveClass(/text-\[#2563EB\]/);
  });
});
