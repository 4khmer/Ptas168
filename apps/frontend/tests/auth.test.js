import { test, expect } from '@playwright/test';
import { login, mockApi } from './helpers.js';

test.describe('Authentication', () => {
  test('shows login page when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('PBMS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Telegram/i })).toBeVisible();
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter your phone number.')).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByPlaceholder('e.g. admin').fill('wronguser');
    await page.getByPlaceholder('Enter password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.bg-\\[\\#FFEDEA\\]')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/');
    const pwdInput = page.getByPlaceholder('Enter password');
    await expect(pwdInput).toHaveAttribute('type', 'password');
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();
    await expect(pwdInput).toHaveAttribute('type', 'text');
  });

  test('logs in with valid credentials', async ({ page }) => {
    await login(page);
    await expect(page.locator('nav.bottom-nav')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
  });

  test('logs out and returns to login', async ({ page }) => {
    await login(page);
    await page.getByText('More').click();
    await page.getByRole('button', { name: 'Log Out' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
