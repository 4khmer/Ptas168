import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { asyncHandler } from '../../middleware/async-handler'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

healthRouter.get(
  '/db',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'reachable', timestamp: new Date().toISOString() })
    } catch (err) {
      res.status(503).json({
        status: 'error',
        db: 'unreachable',
        message: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      })
    }
  }),
)
