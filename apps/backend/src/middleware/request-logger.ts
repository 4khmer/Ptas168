import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Options, HttpLogger } from 'pino-http'
import { logger } from '../config/logger.js'

// pino-http v10's bundled .d.ts declares the callable but never exports it
// as `default` or `export =`. NodeNext + ESM mode can't synthesize the
// default — only CJS+esModuleInterop did. We go through createRequire so
// the runtime call works (Node's CJS interop is happy) and cast the result
// to the typed function shape from the same package's named exports.

const require = createRequire(import.meta.url)
const pinoHttp = require('pino-http') as <
  IM extends IncomingMessage = IncomingMessage,
  SR extends ServerResponse = ServerResponse,
>(opts?: Options<IM, SR>) => HttpLogger<IM, SR>

const opts: Options<IncomingMessage, ServerResponse> = {
  logger,
  genReqId: (req, res) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID()
    res.setHeader('x-request-id', id)
    return id
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode}: ${err.message}`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: (req as { id?: unknown }).id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}

export const requestLogger = pinoHttp<IncomingMessage, ServerResponse>(opts)
