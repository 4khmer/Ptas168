import type { Request, Response } from 'express'
import { ValidationError } from '../../utils/errors.js'
import { putUpload } from '../../lib/storage.js'

export const uploadsController = {
  // multer.single('file') populates req.file with the in-memory buffer.
  // The storage backend (R2 or disk) is chosen at module load — see
  // src/lib/storage.ts.
  async create(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new ValidationError('No file uploaded (expected field "file")')
    const hostUrl = `${req.protocol}://${req.get('host')}`
    const result = await putUpload(
      {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      },
      hostUrl,
    )
    res.status(201).json(result)
  },
}
