/* eslint-disable no-console */
// Demo dataset — separate from prisma/seed.ts so production seeds stay lean.
// Idempotent: every row uses a fixed `demo-*` id and is upserted in place.
// Re-running this script updates in place, never duplicates.
//
//   pnpm prisma:demo-seed                  # populate
//   pnpm db:reset && pnpm prisma:seed \    # to wipe + re-seed everything
//     && pnpm prisma:demo-seed

import dotenv from 'dotenv'
import path from 'node:path'
import { PrismaClient, Prisma } from '@prisma/client'

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env.development'
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

const prisma = new PrismaClient()

const D = (n: number | string) => new Prisma.Decimal(n)
const date = (iso: string) => new Date(`${iso}T00:00:00Z`)

async function main(): Promise<void> {
  // ── Property ────────────────────────────────────────────────────────────
  const building = await prisma.building.upsert({
    where: { id: 'demo-bld-1' },
    update: {},
    create: { id: 'demo-bld-1', name: 'Sunset Apartments', remark: 'Demo building' },
  })

  const floorG = await prisma.floor.upsert({
    where: { id: 'demo-flr-1' },
    update: {},
    create: { id: 'demo-flr-1', buildingId: building.id, name: 'Ground Floor' },
  })
  const floor1 = await prisma.floor.upsert({
    where: { id: 'demo-flr-2' },
    update: {},
    create: { id: 'demo-flr-2', buildingId: building.id, name: '1st Floor' },
  })

  const rooms = [
    { id: 'demo-room-101', floor: floorG, name: '101', price: 300 },
    { id: 'demo-room-102', floor: floorG, name: '102', price: 280 },
    { id: 'demo-room-201', floor: floor1, name: '201', price: 350 },
    { id: 'demo-room-202', floor: floor1, name: '202', price: 320 },
  ]
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        floorId: r.floor.id,
        buildingId: building.id,
        name: r.name,
        size: '4x5 m',
        pricePerMonth: D(r.price),
      },
    })
  }
  console.log(`✔ Property: 1 building, 2 floors, ${rooms.length} rooms`)

  // ── Tenants ─────────────────────────────────────────────────────────────
  const tenant1 = await prisma.tenant.upsert({
    where: { phone: '012345001' },
    update: {},
    create: {
      id: 'demo-tnt-1',
      fullName: 'Sokha Pich',
      phone: '012345001',
    },
  })
  const tenant2 = await prisma.tenant.upsert({
    where: { phone: '012345002' },
    update: {},
    create: {
      id: 'demo-tnt-2',
      fullName: 'Bopha Sok',
      phone: '012345002',
    },
  })
  console.log('✔ Tenants: Sokha Pich, Bopha Sok')

  // ── Contracts (occupies rooms 101 and 201) ───────────────────────────────
  await prisma.contract.upsert({
    where: { id: 'demo-ctr-1' },
    update: {},
    create: {
      id: 'demo-ctr-1',
      roomId: 'demo-room-101',
      tenantId: tenant1.id,
      tenantName: tenant1.fullName,
      tenantPhone: tenant1.phone,
      startDate: date('2026-04-01'),
      baseRent: D(300),
      securityDeposit: D(600),
      status: 'active',
    },
  })
  await prisma.contract.upsert({
    where: { id: 'demo-ctr-2' },
    update: {},
    create: {
      id: 'demo-ctr-2',
      roomId: 'demo-room-201',
      tenantId: tenant2.id,
      tenantName: tenant2.fullName,
      tenantPhone: tenant2.phone,
      startDate: date('2026-05-01'),
      baseRent: D(350),
      securityDeposit: D(700),
      status: 'active',
    },
  })
  console.log('✔ Contracts: 2 active (room 101, 201)')

  // ── Room services (matches the auto-enable behavior of POST /contracts) ──
  for (const roomId of ['demo-room-101', 'demo-room-201']) {
    for (const serviceFeeId of ['svc-water', 'svc-elec']) {
      await prisma.roomService.upsert({
        where: { roomId_serviceFeeId: { roomId, serviceFeeId } },
        update: {},
        create: { roomId, serviceFeeId, active: true },
      })
    }
  }
  console.log('✔ Room services: Water + Electricity activated on occupied rooms')

  // ── Meter readings ──────────────────────────────────────────────────────
  // April → May progression for room 101 (paid invoice covers Apr)
  // May only for room 201 (in-progress invoice covers May)
  const readings = [
    // Room 101 — April
    { id: 'demo-mr-101-w-apr', roomId: 'demo-room-101', serviceType: 'WATER' as const,       recordDate: date('2026-04-30'), prev: 100, curr: 105 },
    { id: 'demo-mr-101-e-apr', roomId: 'demo-room-101', serviceType: 'ELECTRICITY' as const, recordDate: date('2026-04-30'), prev: 200, curr: 250 },
    // Room 101 — May (carry-forward)
    { id: 'demo-mr-101-w-may', roomId: 'demo-room-101', serviceType: 'WATER' as const,       recordDate: date('2026-05-25'), prev: 105, curr: 109 },
    { id: 'demo-mr-101-e-may', roomId: 'demo-room-101', serviceType: 'ELECTRICITY' as const, recordDate: date('2026-05-25'), prev: 250, curr: 295 },
    // Room 201 — May only
    { id: 'demo-mr-201-w-may', roomId: 'demo-room-201', serviceType: 'WATER' as const,       recordDate: date('2026-05-25'), prev: 50,  curr: 58 },
    { id: 'demo-mr-201-e-may', roomId: 'demo-room-201', serviceType: 'ELECTRICITY' as const, recordDate: date('2026-05-25'), prev: 150, curr: 220 },
  ]
  for (const m of readings) {
    await prisma.meterReading.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        roomId: m.roomId,
        serviceType: m.serviceType,
        recordDate: m.recordDate,
        recordedByName: 'Admin Owner',
        previousReading: D(m.prev),
        currentReading: D(m.curr),
      },
    })
  }
  console.log(`✔ Meter readings: ${readings.length} rows`)

  // ── Invoices ────────────────────────────────────────────────────────────
  // Invoice 1: PAID, room 101, April 2026
  // Rent 300 + Water (5 m³ × 0.30 = 1.50) + Electricity (50 kWh × 0.25 = 12.50) = 314.00
  await prisma.invoice.upsert({
    where: { id: 'demo-inv-1' },
    update: {},
    create: {
      id: 'demo-inv-1',
      invoiceNumber: 'INV-202604-000001',
      roomId: 'demo-room-101',
      tenantId: tenant1.id,
      tenantName: tenant1.fullName,
      tenantPhone: tenant1.phone,
      roomName: '101',
      buildingName: 'Sunset Apartments',
      floorName: 'Ground Floor',
      billPeriodStart: date('2026-04-01'),
      billPeriodEnd:   date('2026-04-30'),
      dueDate:         date('2026-05-14'),
      billDays: 30,
      daysInMonth: 30,
      status: 'paid',
      baseRent:        D(300),
      securityDeposit: D(0),
      subtotal:        D(314.00),
      totalAmount:     D(314.00),
      exchangeRate:    D(4000),
      khrAmount:       D(1_256_000),
      paymentMethod: 'Cash',
      paidAt: new Date('2026-05-05T10:30:00Z'),
      lineItems: {
        create: [
          { lineItemType: 'RENT',          description: 'Monthly rent — April 2026', amount: D(300) },
          { lineItemType: 'WATER',         description: 'Water usage',       previousReading: D(100), currentReading: D(105), unitPrice: D('0.30'),  amount: D('1.50') },
          { lineItemType: 'ELECTRICITY',   description: 'Electricity usage', previousReading: D(200), currentReading: D(250), unitPrice: D('0.25'),  amount: D('12.50') },
        ],
      },
    },
  })

  // Invoice 2: IN PROGRESS, room 201, May 2026 (current month → not overdue yet)
  // Rent 350 + Water (8 m³ × 0.30 = 2.40) + Electricity (70 kWh × 0.25 = 17.50) = 369.90
  await prisma.invoice.upsert({
    where: { id: 'demo-inv-2' },
    update: {},
    create: {
      id: 'demo-inv-2',
      invoiceNumber: 'INV-202605-000001',
      roomId: 'demo-room-201',
      tenantId: tenant2.id,
      tenantName: tenant2.fullName,
      tenantPhone: tenant2.phone,
      roomName: '201',
      buildingName: 'Sunset Apartments',
      floorName: '1st Floor',
      billPeriodStart: date('2026-05-01'),
      billPeriodEnd:   date('2026-05-31'),
      dueDate:         date('2026-06-14'),
      billDays: 31,
      daysInMonth: 31,
      status: 'progress',
      baseRent:        D(350),
      securityDeposit: D(0),
      subtotal:        D('369.90'),
      totalAmount:     D('369.90'),
      exchangeRate:    D(4000),
      khrAmount:       D(1_479_600),
      lineItems: {
        create: [
          { lineItemType: 'RENT',        description: 'Monthly rent — May 2026', amount: D(350) },
          { lineItemType: 'WATER',       description: 'Water usage',       previousReading: D(50),  currentReading: D(58),  unitPrice: D('0.30'), amount: D('2.40') },
          { lineItemType: 'ELECTRICITY', description: 'Electricity usage', previousReading: D(150), currentReading: D(220), unitPrice: D('0.25'), amount: D('17.50') },
        ],
      },
    },
  })
  console.log('✔ Invoices: 1 paid (April, room 101), 1 in-progress (May, room 201)')

  console.log('\nDemo data ready. Log in as admin / admin123.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
