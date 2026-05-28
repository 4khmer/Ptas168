// Downscale an image File before upload. Phone photos are routinely
// 5–10 MB; resizing in the browser keeps the payload small (~100–250 KB)
// regardless of whether the backend stores it as base64 or as a file
// served from disk.

export interface ResizeOptions {
  maxDimension?: number
  quality?: number
  mime?: string
}

const DEFAULTS: Required<ResizeOptions> = { maxDimension: 1024, quality: 0.85, mime: 'image/jpeg' }

async function loadImage(file: File | Blob): Promise<{ img: HTMLImageElement; dataUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = dataUrl
  })
  return { img, dataUrl }
}

function drawScaled(img: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return canvas
}

// Returns a JPEG data URL (legacy code path — used where the backend
// still expects an inline string).
export async function resizeImageToDataURL(file: File | null | undefined, opts: ResizeOptions = {}): Promise<string | null> {
  if (!file) return null
  const { maxDimension, quality, mime } = { ...DEFAULTS, ...opts }
  const { img, dataUrl } = await loadImage(file)
  if (file.size < 200 * 1024) return dataUrl     // tiny — skip re-encoding
  return drawScaled(img, maxDimension).toDataURL(mime, quality)
}

// Returns a Blob — preferred for the new /api/uploads multipart endpoint
// since it avoids a base64 round-trip on the wire.
export async function resizeImageToBlob(file: File | Blob | null | undefined, opts: ResizeOptions = {}): Promise<Blob | null> {
  if (!file) return null
  const { maxDimension, quality, mime } = { ...DEFAULTS, ...opts }
  const { img } = await loadImage(file)
  // Even small originals get re-encoded to JPEG so the server gets a
  // single canonical file format.
  return new Promise<Blob>((resolve, reject) => {
    drawScaled(img, maxDimension).toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      mime,
      quality,
    )
  })
}
