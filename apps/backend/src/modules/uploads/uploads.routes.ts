import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { uploadsController } from './uploads.controller.js'
import { ValidationError } from '../../utils/errors.js'
import { DISK_UPLOAD_DIR, isR2Configured } from '../../lib/storage.js'
import { logger } from '../../config/logger.js'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

// In-memory storage — the controller hands the buffer to storage.putUpload
// which then routes to R2 or disk. For 10MB max images this is fine; switch
// to disk-buffered multer if file sizes grow.
const upload = multer({
  storage: multer.memoryStorage(),
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

logger.info(
  { backend: isR2Configured ? 'R2' : 'disk', diskDir: isR2Configured ? undefined : DISK_UPLOAD_DIR },
  'Upload storage backend',
)

export const uploadsRouter = Router()
uploadsRouter.use(authMiddleware)
uploadsRouter.post('/', handleUpload, asyncHandler(uploadsController.create))

// Re-exported so app.ts can mount express.static against the same path when
// disk is the active backend (production-on-R2 skips this mount).
export { DISK_UPLOAD_DIR as UPLOAD_DIR_RESOLVED, isR2Configured }
