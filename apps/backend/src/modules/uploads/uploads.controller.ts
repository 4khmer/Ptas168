import type { Request, Response } from 'express'
import { ValidationError } from '../../utils/errors.js'
import { env } from '../../config/env.js'

// Falls back to host-relative /uploads so dev works even without FILE_URL_BASE
// configured. In production FILE_URL_BASE points at Tomcat's public path.
function buildPublicUrl(req: Request, filename: string): string {
  const base = env.FILE_URL_BASE
    ? env.FILE_URL_BASE.replace(/\/$/, '')
    : `${req.protocol}://${req.get('host')}/uploads`
  return `${base}/${filename}`
}

export const uploadsController = {
  // multer.single('file') populates req.file with the saved-to-disk metadata.
  async create(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new ValidationError('No file uploaded (expected field "file")')
    res.status(201).json({
      url: buildPublicUrl(req, req.file.filename),
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })
  },
}
