// @ptas/db — re-exports of the generated Prisma client.
//
// Apps create their own PrismaClient INSTANCE (so each can tune the
// connection pool and log level for its workload). They share types
// and the schema via this package.
//
// Usage:
//   import { PrismaClient } from '@ptas/db'         // class
//   import type { Building, Invoice } from '@ptas/db' // model types
//   import { Prisma } from '@ptas/db'                // namespace (Decimal, errors)

export { PrismaClient, Prisma } from '@prisma/client'
export type * from '@prisma/client'
