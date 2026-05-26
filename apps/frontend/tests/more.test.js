import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('More page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('More').click();
  });

  test('shows user profile card', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /Owner|Manager|Staff|Viewer/ }).first()).toBeVisible();
  });

  test('language selector has English and Khmer options', async ({ page }) => {
    // Each language button contains two text nodes (native + label), use role
    await expect(page.getByRole('button', { name: 'English English' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ភាសាខ្មែរ Khmer' })).toBeVisible();
  });

  test('switching language updates active state', async ({ page }) => {
    await page.getByRole('button', { name: 'ភាសាខ្មែរ Khmer' }).click();
    const kmBtn = page.getByRole('button', { name: 'ភាសាខ្មែរ Khmer' });
    await expect(kmBtn).toHaveClass(/border-\[#2563EB\]/);
    // Switch back
    await page.getByRole('button', { name: 'English English' }).click();
  });

  test('Property Management link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: /Property Management/i }).click();
    await expect(page).toHaveURL(/\/property/);
    await expect(page.getByText('Property Management')).toBeVisible();
  });

  test('Service Fees link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: /Service Fees/i }).click();
    await expect(page).toHaveURL(/\/services/);
  });

  test('Invoice Setup link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: /Invoice Setup/i }).click();
    await expect(page).toHaveURL(/\/invoice-setup/);
  });

  test('Sub Users link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: /Sub Users/i }).click();
    await expect(page).toHaveURL(/\/sub-users/);
  });

  test('Terms & Conditions link navigates correctly', async ({ page }) => {
    await page.getByRole('button', { name: /Terms & Conditions/i }).click();
    await expect(page).toHaveURL(/\/terms/);
  });

  test('Profile card navigates to profile page', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Owner|Manager|Staff|Viewer/ }).first().click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
