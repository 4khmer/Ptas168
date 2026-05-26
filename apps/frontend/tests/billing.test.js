import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Billing').click();
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  });

  test('displays status tabs', async ({ page }) => {
    for (const label of ['All', 'In Progress', 'Paid', 'Overdue', 'Cancelled']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('All tab is active by default', async ({ page }) => {
    const allTab = page.getByRole('button', { name: 'All' });
    await expect(allTab).toHaveClass(/text-\[#2563EB\]/);
  });

  test('switching tabs filters invoices', async ({ page }) => {
    await page.getByRole('button', { name: 'Paid' }).click();
    await expect(page.getByRole('button', { name: 'Paid' })).toHaveClass(/text-\[#2563EB\]/);
  });

  test('filter panel opens and closes', async ({ page }) => {
    const filterBtn = page.getByRole('button', { name: /Filter/i });
    await filterBtn.click();
    // Filter panel renders two date inputs; check the first one is visible
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await filterBtn.click();
    await expect(page.locator('input[type="date"]').first()).not.toBeVisible();
  });

  test('date filter highlights filter button', async ({ page }) => {
    await page.getByRole('button', { name: /Filter/i }).click();
    await page.locator('input[type="date"]').first().fill('2025-01-01');
    const filterBtn = page.getByRole('button', { name: /Filter/i });
    await expect(filterBtn).toHaveClass(/border-\[#2563EB\]/);
  });

  test('clicking an invoice navigates to detail', async ({ page }) => {
    // Mock data has INV-2025-001 for Room 101
    await expect(page.getByText('Room 101')).toBeVisible();
    await page.getByText('Room 101').first().click();
    await expect(page).toHaveURL(/\/invoice\//);
  });
});
