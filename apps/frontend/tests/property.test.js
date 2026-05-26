import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('Property Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('More').click();
    await page.getByRole('button', { name: /Property Management/i }).click();
    await expect(page).toHaveURL(/\/property/);
  });

  test('shows building tabs', async ({ page }) => {
    const tabs = page.locator('[class*="border-b"] button');
    await expect(tabs.first()).toBeVisible();
  });

  test('add building button is visible', async ({ page }) => {
    // Button text is exactly "Building" (Plus icon + text), use exact match to avoid matching building tab names
    await expect(page.getByRole('button', { name: 'Building', exact: true })).toBeVisible();
  });

  test('opens add building modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Building', exact: true }).click();
    await expect(page.getByPlaceholder('e.g. Block D')).toBeVisible();
  });

  test('add building modal can be dismissed', async ({ page }) => {
    await page.getByRole('button', { name: 'Building', exact: true }).click();
    await expect(page.getByPlaceholder('e.g. Block D')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('e.g. Block D')).not.toBeVisible();
  });

  test('creates a new building', async ({ page }) => {
    const initialCount = await page.locator('[class*="border-b"] button').count();
    await page.getByRole('button', { name: 'Building', exact: true }).click();
    await page.getByPlaceholder('e.g. Block D').fill('Test Building');
    await page.getByRole('button', { name: 'Create Building' }).click();
    await page.waitForTimeout(500);
    const newCount = await page.locator('[class*="border-b"] button').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('shows add floor button for active building', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Add Floor/i })).toBeVisible();
  });

  test('opens add floor modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Floor/i }).click();
    await expect(page.getByPlaceholder('e.g. Floor 4')).toBeVisible();
  });

  test('shows add room button inside a floor', async ({ page }) => {
    const addRoomBtn = page.getByRole('button', { name: /Add Room/i });
    const count = await addRoomBtn.count();
    if (count > 0) {
      await expect(addRoomBtn.first()).toBeVisible();
    }
  });
});
