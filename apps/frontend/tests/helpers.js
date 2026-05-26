// client.js uses relative base URL /api → browser fetches http://localhost:5173/api/...
const API_BASE = 'http://localhost:5173/api';

const MOCK_TOKEN = 'test-token-123';

const MOCK_USER = {
  id: '1',
  fullName: 'Admin User',
  username: 'admin',
  phone: '0123456789',
  role: 'OWNER',
  profileImage: null,
};

const MOCK_BUILDINGS = [
  { id: 'b1', name: 'Main Building', remark: '' },
  { id: 'b2', name: 'Annex Block', remark: '' },
];

const MOCK_ROOMS = [
  { id: 'r1', floorId: 'f1', buildingId: 'b1', floorName: 'Floor 1', name: 'Room 101', pricePerMonth: 200, occupied: true, tenantName: 'John Doe', canStartBill: false, dayCounter: 15, daysInMonth: 30, active: true },
  { id: 'r2', floorId: 'f1', buildingId: 'b1', floorName: 'Floor 1', name: 'Room 102', pricePerMonth: 200, occupied: false, tenantName: null, canStartBill: false, dayCounter: 1, daysInMonth: 30, active: true },
  { id: 'r3', floorId: 'f2', buildingId: 'b1', floorName: 'Floor 2', name: 'Room 201', pricePerMonth: 250, occupied: true, tenantName: 'Jane Smith', canStartBill: true, dayCounter: 28, daysInMonth: 30, active: true },
];

const MOCK_SERVICE_FEES = [
  { id: 'sf1', name: 'Water', serviceType: 'WATER', defaultRate: 0.5, unit: 'm3', active: true, deletable: false },
  { id: 'sf2', name: 'Electricity', serviceType: 'ELECTRICITY', defaultRate: 0.1, unit: 'kWh', active: true, deletable: false },
  { id: 'sf3', name: 'Parking', serviceType: 'FIXED', icon: 'ParkingSquare', defaultRate: 20, unit: 'mo', active: true, deletable: true },
];

const MOCK_INVOICES = [
  {
    id: 'inv1', invoiceNumber: 'INV-2025-001', roomId: 'r1', tenantId: 't1',
    tenantName: 'John Doe', roomName: 'Room 101', buildingName: 'Main Building', floorName: 'Floor 1',
    billPeriodStart: '2025-03-01', billPeriodEnd: '2025-03-31', dueDate: '2025-04-05',
    billDays: 31, daysInMonth: 31, status: 'IN_PROGRESS', baseRent: 200,
    totalAmount: 250, exchangeRate: 4000, createdAt: '2025-03-01T00:00:00Z', lineItems: [],
  },
  {
    id: 'inv2', invoiceNumber: 'INV-2025-002', roomId: 'r3', tenantId: 't2',
    tenantName: 'Jane Smith', roomName: 'Room 201', buildingName: 'Main Building', floorName: 'Floor 2',
    billPeriodStart: '2025-02-01', billPeriodEnd: '2025-02-28', dueDate: '2025-03-05',
    billDays: 28, daysInMonth: 28, status: 'PAID', baseRent: 250,
    totalAmount: 300, exchangeRate: 4000, createdAt: '2025-02-01T00:00:00Z', lineItems: [],
  },
];

const MOCK_SETTINGS = { KHR_EXCHANGE_RATE: '4100' };

const MOCK_FLOORS = [
  { id: 'f1', buildingId: 'b1', name: 'Floor 1', remark: '' },
  { id: 'f2', buildingId: 'b1', name: 'Floor 2', remark: '' },
];

function ok(data) {
  return { success: true, data };
}

/**
 * Intercept all backend API calls and return mock data.
 * @param {import('@playwright/test').Page} page
 */
export async function mockApi(page) {
  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = url.replace(API_BASE, '').split('?')[0];

    // Auth
    if (method === 'POST' && path === '/auth/login') {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.username !== 'admin' || body.password !== 'admin123') {
        return route.fulfill({ status: 401, json: { success: false, message: 'Invalid phone or password' } });
      }
      return route.fulfill({ json: ok({ token: MOCK_TOKEN, user: MOCK_USER }) });
    }
    if (method === 'POST' && path === '/auth/logout') {
      return route.fulfill({ json: { success: true, data: null } });
    }
    if (method === 'GET' && path === '/auth/me') {
      return route.fulfill({ json: ok(MOCK_USER) });
    }
    if (method === 'GET' && path === '/auth/profile') {
      return route.fulfill({ json: ok({ ...MOCK_USER }) });
    }

    // Buildings
    if (method === 'GET' && path === '/buildings') {
      return route.fulfill({ json: ok(MOCK_BUILDINGS) });
    }
    if (method === 'POST' && path === '/buildings') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: `b${Date.now()}`, name: body.name, remark: body.remark || '' }) });
    }
    if (method === 'PUT' && path.startsWith('/buildings/')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: path.split('/')[2], ...body }) });
    }
    if (method === 'DELETE' && path.startsWith('/buildings/')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Floors
    if (method === 'GET' && path.startsWith('/buildings/') && path.endsWith('/floors')) {
      return route.fulfill({ json: ok(MOCK_FLOORS) });
    }
    if (method === 'GET' && path === '/floors') {
      return route.fulfill({ json: ok(MOCK_FLOORS) });
    }
    if (method === 'POST' && path.startsWith('/buildings/') && path.endsWith('/floors')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: `f${Date.now()}`, buildingId: path.split('/')[2], ...body }) });
    }
    if (method === 'PUT' && path.startsWith('/floors/')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: path.split('/')[2], ...body }) });
    }
    if (method === 'DELETE' && path.startsWith('/floors/')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Rooms
    if (method === 'GET' && path === '/rooms') {
      return route.fulfill({ json: ok(MOCK_ROOMS) });
    }
    if (method === 'GET' && path.startsWith('/rooms/')) {
      const id = path.split('/')[2];
      const room = MOCK_ROOMS.find(r => r.id === id) || MOCK_ROOMS[0];
      return route.fulfill({ json: ok(room) });
    }
    if (method === 'POST' && path.startsWith('/floors/') && path.endsWith('/rooms')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: `r${Date.now()}`, floorId: path.split('/')[2], ...body }) });
    }
    if (method === 'PUT' && path.startsWith('/rooms/')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: path.split('/')[2], ...body }) });
    }
    if (method === 'DELETE' && path.startsWith('/rooms/')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Service fees
    if (method === 'GET' && path === '/service-fees') {
      return route.fulfill({ json: ok(MOCK_SERVICE_FEES) });
    }
    if (method === 'POST' && path === '/service-fees') {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: `sf${Date.now()}`, ...body }) });
    }
    if (method === 'PUT' && path.startsWith('/service-fees/')) {
      const body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ json: ok({ id: path.split('/')[2], ...body }) });
    }
    if (method === 'DELETE' && path.startsWith('/service-fees/')) {
      return route.fulfill({ status: 204, body: '' });
    }

    // Settings
    if (method === 'GET' && path === '/settings') {
      return route.fulfill({ json: ok(MOCK_SETTINGS) });
    }
    if (method === 'PUT' && path === '/settings') {
      return route.fulfill({ json: ok(MOCK_SETTINGS) });
    }

    // Invoices
    if (method === 'GET' && path === '/invoices') {
      return route.fulfill({ json: ok(MOCK_INVOICES) });
    }
    if (method === 'GET' && path.startsWith('/invoices/')) {
      const id = path.split('/')[2];
      const inv = MOCK_INVOICES.find(i => i.id === id) || MOCK_INVOICES[0];
      return route.fulfill({ json: ok(inv) });
    }

    // Contracts, room services, meter readings (per-room lazy loads)
    if (method === 'GET' && path.startsWith('/rooms/') && path.endsWith('/contracts')) {
      return route.fulfill({ json: ok([]) });
    }
    if (method === 'GET' && path.startsWith('/rooms/') && path.endsWith('/services')) {
      return route.fulfill({ json: ok([]) });
    }
    if (method === 'GET' && path.startsWith('/rooms/') && path.endsWith('/meter-readings')) {
      return route.fulfill({ json: ok([]) });
    }
    if (method === 'GET' && path.startsWith('/rooms/') && path.endsWith('/meter-readings/latest')) {
      return route.fulfill({ json: ok([]) });
    }

    // Sub users & notifications (background, non-blocking)
    if (method === 'GET' && (path.includes('/users') || path.includes('/sub-users'))) {
      return route.fulfill({ json: ok([]) });
    }
    if (method === 'GET' && path.includes('/notifications')) {
      return route.fulfill({ json: ok([]) });
    }

    // Tenants
    if (method === 'GET' && path.startsWith('/tenants/lookup')) {
      return route.fulfill({ json: ok(null) });
    }
    if (method === 'GET' && path === '/tenants') {
      return route.fulfill({ json: ok([
        { id: 't1', fullName: 'John Doe', phone: '0112233445', profilePhotoUrl: null },
        { id: 't2', fullName: 'Jane Smith', phone: '0998877665', profilePhotoUrl: null },
      ]) });
    }
    if (method === 'GET' && path.startsWith('/tenants/')) {
      const id = path.split('/')[2];
      const t = id === 't1'
        ? { id: 't1', fullName: 'John Doe', phone: '0112233445', profilePhotoUrl: null }
        : { id: 't2', fullName: 'Jane Smith', phone: '0998877665', profilePhotoUrl: null };
      return route.fulfill({ json: ok(t) });
    }

    // Fallback — log and return empty success
    console.warn(`[mock] Unhandled ${method} ${path}`);
    return route.fulfill({ json: ok(null) });
  });
}

/**
 * Set up API mocks then log in with credentials.
 * @param {import('@playwright/test').Page} page
 */
export async function login(page) {
  await mockApi(page);
  await page.goto('/');
  await page.getByPlaceholder('e.g. admin').fill('admin');
  await page.getByPlaceholder('Enter password').fill('admin123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForSelector('nav.bottom-nav', { timeout: 10000 });
}
