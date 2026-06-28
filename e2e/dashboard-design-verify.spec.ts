/**
 * Dashboard Design Verification Tests
 * Checks skeleton loading, stat cards, sales chart, social performance, and hydration.
 */
import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'http://localhost:3001'
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots/design-verify')

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

async function saveScreenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: false })
  return filepath
}

async function saveFullScreenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: true })
  return filepath
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/signin`)
  await page.waitForLoadState('domcontentloaded')

  // Fill credentials
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await emailInput.fill('dr.kimathi12@gmail.com')
  await passwordInput.fill('TempPass123!')

  await saveScreenshot(page, '01-signin-filled')

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first()
  await submitBtn.click()

  // Wait for navigation away from signin
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 15000 })
  await page.waitForLoadState('domcontentloaded')
}

test.describe('Dashboard Design Verification', () => {
  test.beforeAll(async ({ browser }) => {
    // Pre-login check
  })

  test('1. Skeleton loading state on first load', async ({ browser }) => {
    // Use a fresh context to ensure we see loading states
    const context = await browser.newContext()
    const page = await context.newPage()

    await login(page)

    // Navigate to dashboard — intercept slow requests to catch skeleton
    await page.route('**/api/**', async (route) => {
      // Add a 2s delay to all API calls so skeleton is visible
      await new Promise((r) => setTimeout(r, 2000))
      await route.continue()
    })

    // Navigate to dashboard
    const navPromise = page.goto(`${BASE_URL}/dashboard`)

    // Screenshot immediately after navigation starts (trying to catch skeleton)
    await page.waitForLoadState('domcontentloaded')
    await saveScreenshot(page, '1a-skeleton-domcontentloaded')

    // Wait 300ms then screenshot
    await page.waitForTimeout(300)
    await saveScreenshot(page, '1b-skeleton-300ms')

    // Wait 800ms then screenshot
    await page.waitForTimeout(500)
    await saveScreenshot(page, '1c-skeleton-800ms')

    // Wait for full load
    await navPromise
    await page.waitForLoadState('networkidle')
    await saveScreenshot(page, '1d-fully-loaded')

    // Check no hydration error overlay
    const errorOverlay = page.locator('#nextjs-portal, [data-nextjs-dialog], .nextjs-toast-errors')
    const hasError = await errorOverlay.count()
    console.log(`[1] Hydration error overlay count: ${hasError}`)

    // Check for pulsing skeleton elements (animate-pulse)
    // Note: these are checked by inspecting the DOM for skeleton classes
    const skeletonElements = await page.evaluate(() => {
      const pulseEls = document.querySelectorAll('.animate-pulse')
      return pulseEls.length
    })
    console.log(`[1] Skeleton (animate-pulse) elements count: ${skeletonElements}`)

    await context.close()
  })

  test('2. Stat cards - skeleton then real values', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    // Screenshot early state
    await saveScreenshot(page, '2a-stat-cards-early')

    // Wait for content to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await saveScreenshot(page, '2b-stat-cards-loaded')

    // Check stat card content — look for "Total Sales", "Total Orders", "Today's Sales", "Today's Profits"
    const statLabels = ['Total Sales', 'Total Orders', "Today's Sales", "Today's Profits", "Today's Profit"]
    for (const label of statLabels) {
      const el = page.getByText(label, { exact: false })
      const count = await el.count()
      console.log(`[2] Stat card label "${label}": found ${count}`)
    }

    // Check for "..." text (should NOT be present in stat values)
    const dotsText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const dotsNodes: string[] = []
      let node
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() === '...') dotsNodes.push(node.textContent)
      }
      return dotsNodes.length
    })
    console.log(`[2] "..." text nodes found: ${dotsText} (should be 0)`)

    // Screenshot the stat cards area specifically
    const statSection = page.locator('[data-testid*="stat"], .stat-card, .grid').first()
    await saveScreenshot(page, '2c-stat-cards-closeup')
  })

  test('3. Sales This Week - Area chart check', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Screenshot full page
    await saveFullScreenshot(page, '3a-full-dashboard')

    // Look for the chart section
    const chartSection = page.locator('text=Sales This Week').first()
    const chartSectionCount = await chartSection.count()
    console.log(`[3] "Sales This Week" heading found: ${chartSectionCount}`)

    if (chartSectionCount > 0) {
      // Scroll to chart
      await chartSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await saveScreenshot(page, '3b-chart-section')

      // Check for SVG area elements (recharts area chart uses <path> with fill)
      const areaElements = await page.evaluate(() => {
        // Recharts area chart creates paths with class recharts-area-area
        const areaPath = document.querySelectorAll('.recharts-area-area, .recharts-area')
        const gradientDefs = document.querySelectorAll('defs linearGradient, defs radialGradient')
        const fillPaths = Array.from(document.querySelectorAll('svg path')).filter((p) => {
          const fill = p.getAttribute('fill')
          return fill && fill !== 'none' && fill !== 'transparent'
        })
        return {
          areaAreaCount: areaPath.length,
          gradientCount: gradientDefs.length,
          filledPathCount: fillPaths.length,
        }
      })
      console.log(`[3] Area chart elements:`, JSON.stringify(areaElements))

      // Hover over chart to test tooltip
      const svgEl = page.locator('svg').first()
      if (await svgEl.count() > 0) {
        const box = await svgEl.boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.waitForTimeout(500)
          await saveScreenshot(page, '3c-chart-tooltip-hover')

          // Check tooltip content
          const tooltipText = await page.evaluate(() => {
            const tooltips = document.querySelectorAll('.recharts-tooltip-wrapper, [class*="tooltip"]')
            return Array.from(tooltips).map((t) => t.textContent?.trim()).filter(Boolean)
          })
          console.log(`[3] Tooltip text found:`, JSON.stringify(tooltipText))
        }
      }
    }
  })

  test('4. Social Performance section - filter bar layout', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Find Social Performance section
    const socialSection = page.locator('text=Social Performance').first()
    const socialCount = await socialSection.count()
    console.log(`[4] "Social Performance" heading found: ${socialCount}`)

    if (socialCount > 0) {
      await socialSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await saveScreenshot(page, '4a-social-section')

      // Check filter pills - look for period filter buttons
      const periodPills = ['Today', 'This Week', 'This Month', 'This Year', 'All Time']
      for (const pill of periodPills) {
        const pillEl = page.getByRole('button', { name: pill }).or(page.getByText(pill, { exact: true }))
        const count = await pillEl.count()
        console.log(`[4] Period pill "${pill}": found ${count}`)
      }

      // Check if filter buttons are in a single row vs multiple rows
      const filterLayout = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
          const text = b.textContent?.trim()
          return ['Today', 'This Week', 'This Month', 'This Year', 'All Time'].includes(text || '')
        })

        if (buttons.length === 0) return { found: false, rows: 0 }

        const tops = buttons.map((b) => Math.round(b.getBoundingClientRect().top))
        const uniqueTops = [...new Set(tops)]
        return {
          found: true,
          buttonCount: buttons.length,
          uniqueRows: uniqueTops.length,
          tops: tops,
        }
      })
      console.log(`[4] Filter layout:`, JSON.stringify(filterLayout))

      // Click "This Week" and check for day-of-week dropdown
      const thisWeekBtn = page.getByRole('button', { name: 'This Week' }).or(
        page.getByText('This Week', { exact: true })
      ).first()
      if (await thisWeekBtn.count() > 0) {
        await thisWeekBtn.click()
        await page.waitForTimeout(700)
        await saveScreenshot(page, '4b-this-week-clicked')

        // Check if day-of-week dropdown appeared
        const dayDropdown = await page.evaluate(() => {
          const selects = document.querySelectorAll('select, [role="combobox"], [role="listbox"]')
          const dayKeywords = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'day']
          return Array.from(selects).some((s) => {
            const text = s.textContent?.toLowerCase() || ''
            return dayKeywords.some((d) => text.includes(d.toLowerCase()))
          })
        })
        console.log(`[4] Day-of-week dropdown appeared after "This Week" click: ${dayDropdown}`)
      }

      // Full screenshot of social section
      await saveFullScreenshot(page, '4c-social-full')
    }
  })

  test('5. Platform cards - colored top borders', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const socialSection = page.locator('text=Social Performance').first()
    if (await socialSection.count() > 0) {
      await socialSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
    }

    // Check for platform cards with colored borders
    const platformCardInfo = await page.evaluate(() => {
      // Look for cards that might be platform cards
      const cards = document.querySelectorAll('[class*="card"], [class*="platform"]')
      const results: Array<{ borderColor: string; hasColoredBorder: boolean }> = []

      cards.forEach((card) => {
        const style = window.getComputedStyle(card)
        const borderTopColor = style.borderTopColor
        const borderTopWidth = style.borderTopWidth
        // Check for non-transparent, non-grey, colored top border
        const isColored =
          borderTopColor !== 'rgba(0, 0, 0, 0)' &&
          borderTopColor !== 'transparent' &&
          parseFloat(borderTopWidth) > 0
        if (isColored) {
          results.push({ borderColor: borderTopColor, hasColoredBorder: true })
        }
      })

      // Also check for empty state
      const emptyState = document.querySelector('[class*="empty"], [class*="no-data"]')
      return {
        coloredBorderCards: results,
        emptyStatePresent: !!emptyState,
        totalCards: cards.length,
      }
    })
    console.log(`[5] Platform cards:`, JSON.stringify(platformCardInfo))

    await saveScreenshot(page, '5a-platform-cards')
  })

  test('6. Bar chart - gradient fills', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const socialSection = page.locator('text=Social Performance').first()
    if (await socialSection.count() > 0) {
      await socialSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
    }

    // Check bar chart elements for gradients
    const barChartInfo = await page.evaluate(() => {
      const barPaths = document.querySelectorAll('.recharts-bar-rectangle, .recharts-rectangle, [class*="bar"]')
      const linearGradients = document.querySelectorAll('defs linearGradient')

      const barFills = Array.from(barPaths)
        .map((el) => {
          const fill = el.getAttribute('fill') || window.getComputedStyle(el).fill
          return fill
        })
        .filter(Boolean)

      const gradientIds = Array.from(linearGradients).map((g) => g.id)

      return {
        barCount: barPaths.length,
        barFills: barFills.slice(0, 10),
        gradientCount: linearGradients.length,
        gradientIds: gradientIds,
      }
    })
    console.log(`[6] Bar chart:`, JSON.stringify(barChartInfo))

    await saveScreenshot(page, '6a-bar-chart')
  })

  test('7. No hydration error overlay', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)

    // Check immediately after load for hydration errors
    await saveScreenshot(page, '7a-initial-load')

    const hydrationError = await page.evaluate(() => {
      // Next.js hydration errors show as a portal with specific attributes
      const errorPortal = document.querySelector('#nextjs-portal')
      const errorDialog = document.querySelector('[data-nextjs-dialog]')
      const errorToast = document.querySelector('.nextjs-toast-errors')
      // Also check for "Error:" or "Hydration" text in the page
      const bodyText = document.body.innerText
      const hasHydrationText =
        bodyText.includes('Hydration failed') ||
        bodyText.includes('hydration') ||
        bodyText.includes('Minified React error')
      return {
        hasErrorPortal: !!errorPortal,
        hasErrorDialog: !!errorDialog,
        hasErrorToast: !!errorToast,
        hasHydrationText,
      }
    })
    console.log(`[7] Hydration errors:`, JSON.stringify(hydrationError))

    await page.waitForLoadState('networkidle')
    await saveScreenshot(page, '7b-after-networkidle')

    // Final check after full load
    const hydrationErrorFinal = await page.evaluate(() => {
      const errorPortal = document.querySelector('#nextjs-portal')
      const errorDialog = document.querySelector('[data-nextjs-dialog]')
      return {
        hasErrorPortal: !!errorPortal,
        hasErrorDialog: !!errorDialog,
        bodyStart: document.body.innerText.substring(0, 300),
      }
    })
    console.log(`[7] Final hydration check:`, JSON.stringify(hydrationErrorFinal))
  })
})
