import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Already on Rooms tab after login
  });

  test('displays room cards', async ({ page }) => {
    const cards = page.locator('.bg-white.rounded-xl.border');
    await expect(cards.first()).toBeVisible();
  });

  test('search filters rooms by name', async ({ page }) => {
    await page.getByPlaceholder('Search room or tenant…').fill('101');
    await page.waitForTimeout(300);
    // Room 102 and 201 should not be visible; Room 101 or "No rooms found" is acceptable
    await expect(page.getByText('Room 102')).not.toBeVisible();
    await expect(page.getByText('Room 201')).not.toBeVisible();
  });

  test('search with no match shows empty state', async ({ page }) => {
    await page.getByPlaceholder('Search room or tenant…').fill('xyznonexistent999');
    await page.waitForTimeout(300);
    await expect(page.getByText('No rooms found')).toBeVisible();
  });

  test('building filter dropdown is present', async ({ page }) => {
    // Check the select element itself — options in a closed <select> are not "visible"
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(select).toContainText('All Buildings');
  });

  test('floor filter dropdown is present', async ({ page }) => {
    const select = page.locator('select').nth(1);
    await expect(select).toBeVisible();
    await expect(select).toContainText('All Floors');
  });

  test('clicking a room navigates to room detail', async ({ page }) => {
    // Wait for room cards to render, then click the name of the first occupied room
    const roomName = page.getByText('Room 101');
    await expect(roomName).toBeVisible();
    await roomName.click();
    await expect(page).toHaveURL(/\/room\//);
  });

  test('notifications bell navigates to notifications', async ({ page }) => {
    // Bell is a rounded-full button in the Rooms header
    await page.locator('button[class*="rounded-full"]').click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});
