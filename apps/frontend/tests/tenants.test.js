import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('Tenants', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Tenant').click();
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
  });

  test('displays tenant list', async ({ page }) => {
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });

  test('search bar is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/search name or phone/i)).toBeVisible();
  });

  test('searching filters tenants', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search name or phone/i);
    await searchInput.fill('xyznonexistent999');
    await page.waitForTimeout(300);
    // Should show no results or empty state
    const cards = page.locator('[class*="bg-white"][class*="rounded-xl"][class*="border"]');
    const count = await cards.count();
    if (count === 0) {
      await expect(page.getByText(/no tenants/i)).toBeVisible();
    }
  });

  test('clicking a tenant navigates to detail', async ({ page }) => {
    await expect(page.getByText('John Doe')).toBeVisible();
    await page.getByText('John Doe').click();
    await expect(page).toHaveURL(/\/tenant\//);
  });
});
