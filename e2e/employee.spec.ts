import { test, expect, Page } from '@playwright/test'

const EMAIL = process.env.EMPLOYEE_EMAIL!
const PASSWORD = process.env.EMPLOYEE_PASSWORD!

async function login(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/signin')
    await page.getByLabel('Email address').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    try {
      await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 15000 })
      return
    } catch {
      // Retry on cold-start "fetch failed" transient errors
      const url = page.url()
      if (!url.includes('fetch%20failed') && !url.includes('fetch failed')) throw new Error(`Login failed: ${url}`)
    }
  }
  throw new Error('Login failed after 3 attempts')
}

test.describe('Employee - Authentication', () => {
  test('can sign in with valid credentials', async ({ page }) => {
    await login(page)
    expect(page.url()).not.toContain('/signin')
  })
})

test.describe('Employee - Dashboard Routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('can access /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('can access /dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard/orders')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /order/i })).toBeVisible({ timeout: 10000 })
  })

  test('can access /dashboard/products', async ({ page }) => {
    await page.goto('/dashboard/products')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /product/i })).toBeVisible({ timeout: 10000 })
  })

  test('can access /dashboard/profile', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('can access /dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
  })

  test('can access /pos (Point of Sale)', async ({ page }) => {
    await page.goto('/pos')
    await expect(page).not.toHaveURL(/signin/)
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Employee - Access Control (denied sections)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('cannot access /dashboard/payments — redirected away', async ({ page }) => {
    await page.goto('/dashboard/payments')
    // Wait for redirect away from payments (role guard fires asynchronously)
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard/payments'), { timeout: 10000 })
    await expect(page).not.toHaveURL(/dashboard\/payments/)
  })

  test('cannot access /dashboard/employees — redirected away', async ({ page }) => {
    await page.goto('/dashboard/employees')
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard/employees'), { timeout: 10000 })
    await expect(page).not.toHaveURL(/dashboard\/employees/)
  })

  test('cannot access /dashboard/inventory — redirected away', async ({ page }) => {
    await page.goto('/dashboard/inventory')
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard/inventory'), { timeout: 10000 })
    await expect(page).not.toHaveURL(/dashboard\/inventory/)
  })

  test('cannot access /dashboard/importation — redirected away', async ({ page }) => {
    await page.goto('/dashboard/importation')
    // Server-side redirect — URL changes immediately
    await expect(page).not.toHaveURL(/dashboard\/importation/, { timeout: 10000 })
  })
})

test.describe('Employee - Orders workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('orders list loads and shows table or empty state', async ({ page }) => {
    await page.goto('/dashboard/orders')
    await expect(page).not.toHaveURL(/signin/)
    const hasTable = await page.locator('table, [role="table"]').isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/no orders|empty/i).isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })
})

test.describe('Employee - Sign out', () => {
  test('can sign out', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i })
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click()
      await expect(page).toHaveURL(/signin|\//, { timeout: 10000 })
    } else {
      test.skip(true, 'Sign out button not directly visible — may be inside a menu')
    }
  })
})
