const { chromium } = require('playwright')

const BASE = 'http://localhost:5174'
const ERRORS = []
const ISSUES = []
const BACKEND_ERRORS = []

function log(msg) { console.log('[TEST]', msg) }
function err(msg)  { console.error('[FAIL]', msg); ERRORS.push(msg) }
function issue(pg, msg) { console.warn('[ISSUE]', `${pg}: ${msg}`); ISSUES.push({ page: pg, msg }) }
function backendErr(endpoint, status, message) {
  console.warn('[BACKEND]', `${endpoint} → ${status}: ${message}`)
  BACKEND_ERRORS.push({ endpoint, status, message })
}

async function setupPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
  const page = await ctx.newPage()

  page.on('pageerror', e => err(`Uncaught JS error: ${e.message}`))
  page.on('response', res => {
    const url = res.url()
    if (url.includes('localhost:8080') && !res.ok()) {
      const pathname = new URL(url).pathname
      backendErr(pathname, res.status(), `HTTP ${res.status()}`)
    }
  })

  return { ctx, page }
}

// Client-side nav via bottom nav links (no page reload)
async function navTo(page, path) {
  const link = page.locator(`a[href="${path}"]`).first()
  if (await link.count() > 0) {
    await link.click()
    await page.waitForTimeout(800)
  } else {
    // Fallback: use history API — avoids full reload, triggers React Router
    await page.evaluate(p => window.history.pushState({}, '', p), path)
    // Dispatch popstate so React Router picks it up
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate', { state: {} })))
    await page.waitForTimeout(800)
  }
}

async function clickBack(page) {
  // Click the PageHeader back button (w-8 h-8 rounded-full bg-[#F6F6F6])
  const backBtn = page.locator('.w-8.h-8.rounded-full').first()
  if (await backBtn.count() > 0) {
    await backBtn.click({ timeout: 5000 }).catch(() => page.goBack())
  } else {
    await page.goBack()
  }
  await page.waitForTimeout(400)
}

async function login(page) {
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  log('Filling login form...')
  await page.fill('input[autocomplete="username"]', 'admin')
  await page.fill('input[autocomplete="current-password"]', 'admin123')
  await page.click('button[type="submit"]')
  // Wait for rooms to appear (ensures token is persisted to localStorage)
  await page.waitForSelector('.bg-white.rounded-xl.border', { timeout: 15000 })
  await page.waitForTimeout(500)
  log('Logged in — at Rooms page')
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/ss_${name}.png`, fullPage: false })
}

async function testRoomsPage(page) {
  log('=== ROOMS PAGE ===')
  // Already on '/' after login — just validate
  const rooms = await page.locator('.bg-white.rounded-xl.border').count()
  log(`Rooms visible: ${rooms}`)
  if (rooms === 0) issue('Rooms', 'No room cards rendered')

  // Building filter
  const buildingSelect = page.locator('select').first()
  const buildingOptions = await buildingSelect.locator('option').count()
  log(`Building options: ${buildingOptions}`)
  if (buildingOptions <= 1) issue('Rooms', 'No buildings in filter dropdown')

  // Search
  const searchInput = page.locator('input[type="search"]').first()
  if (await searchInput.count() > 0) {
    await searchInput.fill('101')
    await page.waitForTimeout(300)
    const filtered = await page.locator('.bg-white.rounded-xl.border').count()
    log(`Rooms after search "101": ${filtered}`)
    await searchInput.fill('')
  } else {
    issue('Rooms', 'Search input not found')
  }

  const startBillBtns = await page.locator('button:has-text("Start Bill")').count()
  log(`Start Bill buttons: ${startBillBtns}`)

  await screenshot(page, '01_rooms')
}

async function testRoomDetail(page) {
  log('=== ROOM DETAIL PAGE ===')
  // Click first room card (client-side navigation)
  const firstRoom = page.locator('.bg-white.rounded-xl.border').first()
  await firstRoom.locator('.flex-1.cursor-pointer').click()
  await page.waitForTimeout(1500)

  const url = page.url()
  log(`Navigated to: ${url}`)
  if (!url.includes('/room/')) { issue('RoomDetail', 'Did not navigate to room detail'); return }

  const tabs = await page.locator('button').filter({ hasText: /^(Tenant|Meter|Billing)$/ }).count()
  log(`Room tabs visible: ${tabs}`)
  if (tabs < 3) issue('RoomDetail', `Only ${tabs} tabs visible, expected 3`)

  await screenshot(page, '02_room_detail_tenant')

  await page.locator('button').filter({ hasText: 'Meter' }).click()
  await page.waitForTimeout(800)
  await screenshot(page, '03_room_detail_meter')

  await page.locator('button').filter({ hasText: 'Billing' }).click()
  await page.waitForTimeout(800)
  await screenshot(page, '04_room_detail_billing')

  const startBillBtn = page.locator('button:has-text("Start Bill")').first()
  if (await startBillBtn.count() > 0) {
    log('Opening Start Bill modal...')
    await startBillBtn.click()
    await page.waitForTimeout(800)
    const visible = await page.locator('text=Start Bill').first().isVisible()
    if (!visible) issue('RoomDetail', 'Start Bill modal did not open')
    await screenshot(page, '05_start_bill_modal')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  // Navigate back to rooms via back button
  await clickBack(page)
  await page.waitForTimeout(500)
}

async function testTenantsPage(page) {
  log('=== TENANTS PAGE ===')
  await navTo(page, '/tenants')
  await page.waitForTimeout(1500) // tenants load lazily

  const tenants = await page.locator('.flex.items-center.gap-3.px-4.py-3').count()
  log(`Tenants visible: ${tenants}`)
  if (tenants === 0) issue('Tenants', 'No tenant rows rendered')

  const searchInput = page.locator('input[type="search"]').first()
  if (await searchInput.count() > 0) {
    await searchInput.fill('Somchai')
    await page.waitForTimeout(300)
    const filtered = await page.locator('.flex.items-center.gap-3.px-4.py-3').count()
    log(`Tenants after search "Somchai": ${filtered}`)
    await searchInput.fill('')
  } else {
    issue('Tenants', 'Search input not found')
  }

  await screenshot(page, '06_tenants')
}

async function testTenantDetail(page) {
  log('=== TENANT DETAIL PAGE ===')
  // Must be on /tenants already — click first tenant
  const firstTenant = page.locator('.flex.items-center.gap-3.px-4.py-3').first()
  await firstTenant.click()
  await page.waitForTimeout(1000)

  const url = page.url()
  log(`Navigated to: ${url}`)
  if (!url.includes('/tenant/')) { issue('TenantDetail', 'Did not navigate to tenant detail'); return }

  const nameField = await page.locator('text=Full Name').count()
  log(`Name field visible: ${nameField > 0}`)

  const avatar = await page.locator('.w-20.h-20.rounded-full').count()
  log(`Avatar visible: ${avatar > 0}`)
  if (avatar === 0) issue('TenantDetail', 'Avatar not rendered')

  await screenshot(page, '07_tenant_detail')

  // Go back to tenants
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testBillingPage(page) {
  log('=== BILLING PAGE ===')
  await navTo(page, '/billing')
  await page.waitForTimeout(1500)

  const invoices = await page.locator('.flex.items-center.justify-between.px-4.py-3\\.5').count()
  log(`Invoice rows visible: ${invoices}`)
  if (invoices === 0) issue('Billing', 'No invoices rendered')

  const tabs = ['All', 'In Progress', 'Paid', 'Overdue', 'Cancelled']
  for (const tab of tabs) {
    const btn = page.locator(`button:has-text("${tab}")`).first()
    if (await btn.count() > 0) {
      await btn.click(); await page.waitForTimeout(200)
      log(`Tab "${tab}" clicked OK`)
    } else {
      issue('Billing', `Tab "${tab}" not found`)
    }
  }
  await page.locator('button:has-text("All")').first().click()
  await page.waitForTimeout(200)

  const filterBtn = page.locator('button:has-text("Filter")')
  if (await filterBtn.count() > 0) {
    await filterBtn.click(); await page.waitForTimeout(300)
    const filterPanel = await page.locator('text=Filter by Period').isVisible().catch(() => false)
    log(`Filter panel visible: ${filterPanel}`)
    await filterBtn.click(); await page.waitForTimeout(200)
  }

  await screenshot(page, '08_billing')
}

async function testInvoiceDetail(page) {
  log('=== INVOICE DETAIL PAGE ===')
  // Must be on /billing
  const firstInvoice = page.locator('.flex.items-center.justify-between.px-4.py-3\\.5').first()
  if (await firstInvoice.count() === 0) {
    issue('InvoiceDetail', 'No invoices to click')
    return
  }
  await firstInvoice.click()
  await page.waitForTimeout(1000)

  const url = page.url()
  log(`Navigated to: ${url}`)
  if (!url.includes('/invoice/')) { issue('InvoiceDetail', 'Did not navigate to invoice detail'); return }

  const baseRent = await page.locator('text=Base Rent').count()
  log(`"Base Rent" visible: ${baseRent > 0}`)
  if (baseRent === 0) issue('InvoiceDetail', 'Base Rent line item missing')

  const total = await page.locator('text=Total Due').count()
  log(`"Total Due" visible: ${total > 0}`)

  await screenshot(page, '09_invoice_detail')

  const markPaidBtn = page.locator('button:has-text("Mark as Paid")')
  if (await markPaidBtn.count() > 0) {
    await markPaidBtn.click(); await page.waitForTimeout(500)
    const opened = await page.locator('text=Payment Method').count() > 0
      || await page.locator('text=Mark Paid').count() > 0
      || await page.locator('[role="dialog"]').count() > 0
    log(`Mark Paid modal opened: ${opened}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  const cancelBtn = page.locator('button:has-text("Cancel Invoice")')
  if (await cancelBtn.count() > 0) {
    await cancelBtn.click(); await page.waitForTimeout(500)
    const opened = await page.locator('text=Cancel').count() > 0
    log(`Cancel modal opened: ${opened}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  // Go back to billing
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testMorePage(page) {
  log('=== MORE PAGE ===')
  await navTo(page, '/more')

  const menuItems = await page.locator('button.w-full.flex.items-center.justify-between').count()
  log(`More menu items (justify-between): ${menuItems}`)

  // Also count via text content
  const propMgmt = await page.locator('text=Property Management').count()
  const services = await page.locator('text=Service Fees').count()
  log(`Property Management item: ${propMgmt > 0}, Service Fees item: ${services > 0}`)
  if (propMgmt === 0) issue('More', 'Property Management menu item missing')

  const userCard = await page.locator('text=System Administrator').count()
  log(`User name "System Administrator": ${userCard > 0}`)
  if (userCard === 0) issue('More', 'User name not shown in header card')

  await screenshot(page, '10_more')
}

async function testPropertyPage(page) {
  log('=== PROPERTY PAGE ===')
  // Navigate via More menu
  const propBtn = page.locator('text=Property Management').first()
  if (await propBtn.count() > 0) {
    await propBtn.click(); await page.waitForTimeout(1000)
  } else {
    await page.evaluate(() => window.history.pushState({}, '', '/property'))
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate', { state: {} })))
    await page.waitForTimeout(1000)
  }

  const url = page.url()
  log(`Property page URL: ${url}`)

  const buildingTabs = await page.locator('button').filter({ hasText: /Block [A-Z]|Block/ }).count()
  log(`Building tabs: ${buildingTabs}`)
  if (buildingTabs === 0) issue('Property', 'No building tabs rendered')

  // Add building button
  const addBuildingBtn = page.locator('button').filter({ hasText: /\+.*Building|Building/ }).first()
  if (await addBuildingBtn.count() > 0) {
    await addBuildingBtn.click(); await page.waitForTimeout(500)
    const modal = await page.locator('text=New Building').isVisible().catch(() => false)
    log(`New Building modal: ${modal}`)
    if (!modal) issue('Property', 'New Building modal did not open')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  await screenshot(page, '11_property')

  // Back
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testServiceFeesPage(page) {
  log('=== SERVICE FEES PAGE ===')
  // Navigate via More menu
  await navTo(page, '/more')
  const svcBtn = page.locator('text=Service Fees').first()
  if (await svcBtn.count() > 0) {
    await svcBtn.click(); await page.waitForTimeout(800)
  }

  const url = page.url()
  log(`ServiceFees URL: ${url}`)

  // Services load from store (masterServices from loadInitialData)
  const services = await page.locator('.flex.items-center.justify-between.px-4.py-3\\.5').count()
  log(`Service rows: ${services}`)
  if (services === 0) issue('ServiceFees', 'No services rendered')

  // Edit button for first service
  const editBtns = page.locator('.w-8.h-8.rounded-lg')
  if (await editBtns.count() > 0) {
    await editBtns.first().click(); await page.waitForTimeout(500)
    const editModal = await page.locator('text=Edit').count()
    log(`Edit service modal opened: ${editModal > 0}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  await screenshot(page, '12_service_fees')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testSubUsersPage(page) {
  log('=== SUB USERS PAGE ===')
  await navTo(page, '/more')
  const subBtn = page.locator('text=Sub Users').first()
  if (await subBtn.count() > 0) {
    await subBtn.click(); await page.waitForTimeout(800)
  }

  const url = page.url()
  log(`SubUsers URL: ${url}`)

  const noUsers = await page.locator('text=No sub users yet').count()
  log(`"No sub users yet" shown: ${noUsers > 0}`)

  const addBtn = page.locator('button.fixed')
  if (await addBtn.count() > 0) {
    await addBtn.first().click(); await page.waitForTimeout(500)
    const modal = await page.locator('text=Add Sub User').isVisible().catch(() => false)
    log(`Add Sub User modal: ${modal}`)
    if (!modal) issue('SubUsers', 'Add Sub User modal did not open')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  await screenshot(page, '13_sub_users')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testNotificationsPage(page) {
  log('=== NOTIFICATIONS PAGE ===')
  // Navigate from rooms header bell icon
  await navTo(page, '/')
  await page.waitForTimeout(500)
  const bellBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  // Try via nav
  await navTo(page, '/notifications')

  const empty = await page.locator('text=No notifications yet').count()
  log(`Empty state: ${empty > 0}`)
  const notifs = await page.locator('button.w-full.flex.items-start').count()
  log(`Notification items: ${notifs}`)

  await screenshot(page, '14_notifications')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testProfilePage(page) {
  log('=== PROFILE PAGE ===')
  await navTo(page, '/more')
  const profileBtn = page.locator('text=System Administrator').first()
  if (await profileBtn.count() > 0) {
    await profileBtn.click(); await page.waitForTimeout(800)
  } else {
    await navTo(page, '/profile')
  }

  const url = page.url()
  log(`Profile URL: ${url}`)

  const nameInput = page.locator('input[placeholder="Your full name"]')
  if (await nameInput.count() > 0) {
    const val = await nameInput.inputValue()
    log(`Full name value: "${val}"`)
    if (!val) issue('Profile', 'Full name field is empty')
  }

  const phoneInput = page.locator('input').filter({ hasText: '' }).nth(1)
  const allInputs = await page.locator('input').all()
  for (const inp of allInputs) {
    const placeholder = await inp.getAttribute('placeholder')
    const val = await inp.inputValue()
    log(`Input placeholder="${placeholder}" value="${val}"`)
    if (placeholder?.toLowerCase().includes('phone') && val === 'admin') {
      issue('Profile', 'Phone field shows "admin" instead of real phone number')
    }
  }

  await screenshot(page, '15_profile')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testInvoiceSetupPage(page) {
  log('=== INVOICE SETUP PAGE ===')
  await navTo(page, '/more')
  const setupBtn = page.locator('text=Invoice Setup').first()
  if (await setupBtn.count() > 0) {
    await setupBtn.click(); await page.waitForTimeout(800)
  }

  const url = page.url()
  log(`InvoiceSetup URL: ${url}`)

  const sections = await page.locator('.bg-white.rounded-xl').count()
  log(`Invoice setup sections: ${sections}`)
  if (sections === 0) issue('InvoiceSetup', 'No sections rendered')

  // Toggle first section
  const toggles = page.locator('.w-11.h-6.rounded-full')
  if (await toggles.count() > 0) {
    await toggles.first().click(); await page.waitForTimeout(300)
    await toggles.first().click(); await page.waitForTimeout(300)
    log('Toggle on/off OK')
  }

  await screenshot(page, '16_invoice_setup')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testAddTenantModal(page) {
  log('=== ADD TENANT MODAL ===')
  await navTo(page, '/')
  await page.waitForTimeout(500)

  const vacantBadge = page.locator('span:has-text("Vacant")').first()
  if (await vacantBadge.count() === 0) {
    log('No vacant rooms on Rooms page, skipping')
    return
  }

  // Click the vacant room
  const vacantCard = vacantBadge.locator('xpath=ancestor::div[contains(@class,"bg-white") and contains(@class,"rounded-xl")]')
  await vacantCard.locator('.flex-1.cursor-pointer').click()
  await page.waitForTimeout(1500)

  const addTenantBtn = page.locator('button:has-text("Add Tenant")')
  if (await addTenantBtn.count() > 0) {
    await addTenantBtn.click(); await page.waitForTimeout(500)
    const modal = await page.locator('text=Add Tenant').count()
    log(`Add Tenant modal opened: ${modal > 0}`)
    if (modal === 0) issue('AddTenantModal', 'Modal did not open')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  await screenshot(page, '17_add_tenant')
  await clickBack(page)
  await page.waitForTimeout(300)
}

async function testAddMeterReading(page) {
  log('=== ADD METER READING ===')
  await navTo(page, '/')
  await page.waitForTimeout(500)

  const firstRoom = page.locator('.bg-white.rounded-xl.border').first()
  await firstRoom.locator('.flex-1.cursor-pointer').click()
  await page.waitForTimeout(1500)

  await page.locator('button').filter({ hasText: 'Meter' }).click()
  await page.waitForTimeout(500)

  const newRecordBtn = page.locator('button:has-text("New Record")')
  if (await newRecordBtn.count() > 0) {
    await newRecordBtn.click(); await page.waitForTimeout(500)
    const modal = await page.locator('text=New Meter Record').isVisible().catch(() => false)
    log(`New Meter Record modal: ${modal}`)
    if (!modal) issue('AddMeterModal', 'Modal did not open')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  }

  await screenshot(page, '18_meter_record')
}

async function testNavigation(page) {
  log('=== BOTTOM NAV ===')
  // Navigate to '/' to ensure AppLayout (with BottomNav) is rendered
  await navTo(page, '/')
  await page.waitForTimeout(800)
  const navLinks = await page.locator('nav a').count()
  log(`Bottom nav links: ${navLinks}`)
  if (navLinks < 4) issue('Navigation', `Only ${navLinks} bottom nav links, expected 4`)

  for (const [path, label] of [['/tenants','Tenants'],['/billing','Billing'],['/more','More'],['/', 'Room']]) {
    await navTo(page, path)
    const url = page.url()
    log(`Nav to ${path} → ${url}`)
  }
}

async function run(fn, page, name) {
  try { await fn(page) }
  catch (e) { err(`[${name}] ${e.message.split('\n')[0]}`) }
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const { ctx, page } = await setupPage(browser)

  try {
    await login(page)
  } catch (e) {
    err(`Login failed: ${e.message}`)
    await ctx.close(); await browser.close()
    return
  }

  // Run tests in logical flow order (client-side navigation only)
  await run(testRoomsPage,        page, 'Rooms')
  await run(testRoomDetail,       page, 'RoomDetail')
  await run(testTenantsPage,      page, 'Tenants')
  await run(testTenantDetail,     page, 'TenantDetail')
  await run(testBillingPage,      page, 'Billing')
  await run(testInvoiceDetail,    page, 'InvoiceDetail')
  await run(testMorePage,         page, 'More')
  await run(testPropertyPage,     page, 'Property')
  await run(testServiceFeesPage,  page, 'ServiceFees')
  await run(testSubUsersPage,     page, 'SubUsers')
  await run(testNotificationsPage,page, 'Notifications')
  await run(testProfilePage,      page, 'Profile')
  await run(testInvoiceSetupPage, page, 'InvoiceSetup')
  await run(testAddTenantModal,   page, 'AddTenant')
  await run(testAddMeterReading,  page, 'AddMeter')
  await run(testNavigation,       page, 'Navigation')

  await ctx.close()
  await browser.close()

  console.log('\n========== RESULTS ==========')
  if (ERRORS.length === 0 && ISSUES.length === 0) {
    console.log('✅ All pages passed with no errors or issues')
  } else {
    if (ERRORS.length > 0) {
      console.log(`\n❌ ERRORS (${ERRORS.length}):`)
      ERRORS.forEach(e => console.log('  •', e))
    }
    if (ISSUES.length > 0) {
      console.log(`\n⚠️  ISSUES (${ISSUES.length}):`)
      ISSUES.forEach(i => console.log(`  • [${i.page}] ${i.msg}`))
    }
  }
  if (BACKEND_ERRORS.length > 0) {
    console.log(`\n🔴 BACKEND ERRORS (${BACKEND_ERRORS.length}):`)
    BACKEND_ERRORS.forEach(b => console.log(`  • ${b.endpoint} → ${b.status}: ${b.message}`))
  }
})()
