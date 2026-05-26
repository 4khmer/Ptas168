import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'
import { uploadsController } from './uploads.controller'
import { ValidationError } from '../../utils/errors'
import { env } from '../../config/env'

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

// Resolve the upload dir at module load — fall back to ./uploads relative
// to the backend cwd so dev works without any env wiring.
const uploadDir = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const rawExt = path.extname(file.originalname).toLowerCase()
      const ext = ALLOWED_EXT.has(rawExt) ? rawExt : '.jpg'
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`))
      return
    }
    cb(null, true)
  },
})

// Translate multer's size / mime-type errors into ValidationError so the
// error handler returns a clean 400 instead of a 500.
const handleUpload: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`))
      }
      return next(new ValidationError(err.message))
    }
    return next(new ValidationError(err.message || 'Upload failed'))
  })
}

export const uploadsRouter = Router()
uploadsRouter.use(authMiddleware)
uploadsRouter.post('/', handleUpload, asyncHandler(uploadsController.create))

// Exposed so app.ts can mount express.static against the same path in dev
// (production serves these files via Tomcat, not Express).
export const UPLOAD_DIR_RESOLVED = uploadDir
