import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodSchema, ZodTypeAny } from 'zod'

export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body)
    next()
  }
}

export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = (schema as ZodSchema).parse(req.query) as Request['query']
    Object.assign(req.query, parsed)
    next()
  }
}

export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = (schema as ZodSchema).parse(req.params) as Request['params']
    Object.assign(req.params, parsed)
    next()
  }
}
