/* eslint-disable no-console */
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Loads DATABASE_URL from packages/db/.env when run via `pnpm --filter
// @ptas/db seed`. In CI / prod, set DATABASE_URL in the environment
// directly and this is a no-op.
dotenv.config()

if (process.env.NODE_ENV === 'production') {
  throw new Error('prisma/seed.ts must not run in production — use pnpm --filter @ptas/db deploy + manual SQL if you need to seed.')
}

const prisma = new PrismaClient()

async function main(): Promise<void> {
  // Default owner — credentials login: admin / admin123
  const passwordHash = await bcrypt.hash('admin123', 10)

  const owner = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Admin Owner',
      phone: '0123456789',
      passwordHash,
      role: 'owner',
      status: 'active',
      via: 'credentials',
    },
  })
  console.log(`✔ Owner user: ${owner.username} (id=${owner.id})`)

  // Master service fees — Water + Electricity (system, non-deletable)
  await prisma.serviceFee.upsert({
    where: { id: 'svc-water' },
    update: {},
    create: {
      id: 'svc-water',
      name: 'Water',
      icon: 'Droplets',
      serviceType: 'WATER',
      defaultRate: 0.30,
      unit: 'm³',
      deletable: false,
    },
  })
  await prisma.serviceFee.upsert({
    where: { id: 'svc-elec' },
    update: {},
    create: {
      id: 'svc-elec',
      name: 'Electricity',
      icon: 'Zap',
      serviceType: 'ELECTRICITY',
      defaultRate: 0.25,
      unit: 'kWh',
      deletable: false,
    },
  })
  console.log('✔ Master services seeded: Water, Electricity')

  // Sensible default settings
  const settings: Record<string, string> = {
    KHR_EXCHANGE_RATE: '4000',
    INVOICE_NO_DIGITS: '6',
    INVOICE_HEADER_ENABLED: 'true',
    INVOICE_FOOTER_ENABLED: 'true',
    INVOICE_FOOTER_NOTE: 'Thank you for your business.',
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('✔ Default settings seeded')

  console.log('\nLogin: admin / admin123')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
