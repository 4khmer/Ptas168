// Upload-storage abstraction.
//
// One `storage.put(buffer, ...)` call routes to either Cloudflare R2 (when
// R2_BUCKET + creds are set in env) or local disk under UPLOAD_DIR (fallback
// for dev / first-run / when R2 isn't configured yet).
//
// Both backends return the same shape so the upload controller doesn't care
// which one is wired. The R2 backend uses the S3-compatible API via
// @aws-sdk/client-s3 — R2's endpoint is `https://<account>.r2.cloudflarestorage.com`
// and the bucket is otherwise an S3 bucket.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

export interface PutResult {
  /** Final public URL the browser uses to fetch the file. */
  url: string
  /** Stable filename (the object key in R2, or the basename on disk). */
  filename: string
  size: number
  mimetype: string
}

export interface PutInput {
  buffer: Buffer
  originalName: string
  mimetype: string
}

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function deriveFilename(originalName: string): string {
  const rawExt = path.extname(originalName).toLowerCase()
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : '.jpg'
  return `${Date.now()}-${crypto.randomUUID()}${ext}`
}

// ── R2 backend ────────────────────────────────────────────────────────────

let r2Client: S3Client | null = null
function getR2Client(): S3Client {
  if (r2Client) return r2Client
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 client requested but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set')
  }
  r2Client = new S3Client({
    region: 'auto', // R2 ignores region but the SDK requires the property
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
  return r2Client
}

async function putR2({ buffer, originalName, mimetype }: PutInput): Promise<PutResult> {
  const filename = deriveFilename(originalName)
  await getR2Client().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: mimetype,
  }))
  const base = (env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')
  return {
    url: `${base}/${filename}`,
    filename,
    size: buffer.length,
    mimetype,
  }
}

// ── Disk backend (fallback) ───────────────────────────────────────────────

const diskDir = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads')

function ensureDiskDir(): void {
  if (!fs.existsSync(diskDir)) {
    fs.mkdirSync(diskDir, { recursive: true })
  }
}

async function putDisk({ buffer, originalName, mimetype }: PutInput, hostUrl: string): Promise<PutResult> {
  ensureDiskDir()
  const filename = deriveFilename(originalName)
  await fs.promises.writeFile(path.join(diskDir, filename), buffer)
  const base = env.FILE_URL_BASE
    ? env.FILE_URL_BASE.replace(/\/$/, '')
    : `${hostUrl}/uploads`
  return {
    url: `${base}/${filename}`,
    filename,
    size: buffer.length,
    mimetype,
  }
}

// ── Public surface ────────────────────────────────────────────────────────

export const isR2Configured = !!(env.R2_BUCKET && env.R2_PUBLIC_URL)

/**
 * Persist an uploaded file. Routes to R2 when configured, else disk.
 * `hostUrl` is only used by the disk path when no FILE_URL_BASE is set,
 * so the returned URL points back at the same host the upload came in on.
 */
export async function putUpload(input: PutInput, hostUrl: string): Promise<PutResult> {
  return isR2Configured ? putR2(input) : putDisk(input, hostUrl)
}

/** Resolved disk dir — used by app.ts to mount `express.static` in dev. */
export const DISK_UPLOAD_DIR = diskDir
