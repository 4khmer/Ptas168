import type { NextFunction, Request, Response } from 'express'
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js'
import { verifyJwt, type JwtPayload } from '../utils/jwt.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header')
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) throw new UnauthorizedError('Missing token')

  req.user = verifyJwt(token)
  next()
}

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError()
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
    next()
  }
}
