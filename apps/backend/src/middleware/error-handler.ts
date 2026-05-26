import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from '../utils/errors'
import { env } from '../config/env'
import { logger } from '../config/logger'
import type { ErrorEnvelope, ErrorCode } from '@ptas/contracts'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500
  let code: ErrorCode = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details: unknown

  if (err instanceof ZodError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = 'Request validation failed'
    details = err.flatten()
  } else if (err instanceof AppError) {
    statusCode = err.statusCode
    code = err.code as ErrorCode
    message = err.message
    details = err.details
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409
      code = 'CONFLICT'
      message = 'A record with that value already exists'
      details = err.meta
    } else if (err.code === 'P2025') {
      statusCode = 404
      code = 'NOT_FOUND'
      message = 'Record not found'
    } else {
      statusCode = 400
      code = 'DB_ERROR'
      message = 'Database operation failed'
    }
  } else if (err instanceof Error) {
    message = err.message || message
  }

  const body: ErrorEnvelope = { error: { code, message } }
  if (details !== undefined) body.error.details = details
  if (env.NODE_ENV !== 'production' && err instanceof Error && err.stack) {
    body.error.stack = err.stack
  }

  logger.error(
    {
      err,
      statusCode,
      code,
    },
    `${code}: ${message}`,
  )

  res.status(statusCode).json(body)
}

export const notFoundHandler: import('express').RequestHandler = (req, res) => {
  const body: ErrorEnvelope = {
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  }
  res.status(404).json(body)
}
