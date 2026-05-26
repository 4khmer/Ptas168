const { chromium } = require('playwright')

const BASE = 'http://localhost:5174'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
  const page = await ctx.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]', msg.text())
  })
  page.on('response', res => {
    if (res.url().includes('localhost:8080')) {
      const pathname = new URL(res.url()).pathname
      console.log(`[API] ${res.request().method()} ${pathname} → ${res.status()}`)
    }
  })

  // Login
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000) // Wait for data to load
  await page.screenshot({ path: '/tmp/debug_rooms.png' })
  console.log('[SS] Saved /tmp/debug_rooms.png')

  // Print all visible text content
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('[PAGE TEXT]', bodyText)

  // Print all inputs on page
  const inputs = await page.locator('input').all()
  for (const inp of inputs) {
    const placeholder = await inp.getAttribute('placeholder')
    const type = await inp.getAttribute('type')
    console.log(`[INPUT] type="${type}" placeholder="${placeholder}"`)
  }

  await ctx.close()
  await browser.close()
})()
