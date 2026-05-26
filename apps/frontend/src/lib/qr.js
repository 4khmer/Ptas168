import jsQR from 'jsqr'
import QRCode from 'qrcode'

/**
 * Decode a QR image (File / Blob) into the raw payload string.
 * Returns null if the image isn't a valid QR. Errors propagate
 * for invalid image formats.
 */
export async function decodeQRFromImage(file) {
  const dataUrl = await fileToDataUrl(file)
  const img = await loadImage(dataUrl)
  // Cap the canvas at 1024px on the longest edge — keeps decode fast on huge phone photos.
  const MAX = 1024
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)

  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return result?.data ?? null
}

/**
 * Encode a string into a QR PNG dataUrl. `size` controls the output
 * pixel dimensions; `margin` is the quiet-zone in modules.
 */
export async function encodeQRToDataUrl(text, { size = 256, margin = 2, errorCorrectionLevel = 'M' } = {}) {
  if (!text) return null
  return QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => resolve(ev.target.result)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}
