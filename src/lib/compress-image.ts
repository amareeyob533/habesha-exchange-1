// Client-side image compression utility.
//
// Why: large photos (e.g. 4 MB iPhone HEIC → JPEG, 5+ MB screenshots) take a
// long time to upload to the serverless backend, and base64-encoding them
// bloats the database. By compressing in the browser before upload we cut
// upload time dramatically (a 5 MB photo → ~150 KB) while keeping the image
// clear enough for an admin to read an ID card or a bank transfer screenshot.
//
// Method: draw the image onto a <canvas> at a capped max dimension and export
// as JPEG quality 0.7. HEIC/HEIF from iPhones, PNGs, GIFs, BMPs, etc. are all
// converted to JPEG — universally readable and small. Returns a File (for
// multipart upload) so the existing upload routes work unchanged.

const MAX_DIMENSION = 1280 // cap the longest edge at 1280px — plenty for ID/screenshot review
const JPEG_QUALITY = 0.7   // 0.7 is visually clean and ~10x smaller than original

/**
 * Compress an image File in the browser before upload.
 * - Resizes so the longest edge is at most MAX_DIMENSION (preserves aspect ratio).
 * - Converts to JPEG at JPEG_QUALITY.
 * - Returns a new File ready for FormData upload.
 *
 * If the input is already small or compression fails, the original file is
 * returned unchanged so the upload still works.
 */
export async function compressImage(file: File, maxDim = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<File> {
  // Only attempt compression in the browser.
  if (typeof window === 'undefined' || typeof document === 'undefined') return file
  // Only compress image types.
  if (!file.type.startsWith('image/')) return file

  try {
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImage(dataUrl)
    const { width, height } = img

    // Skip if the image is already small (longest edge <= maxDim) AND it's
    // already a JPEG/WebP under 300 KB — no benefit from recompressing.
    const longest = Math.max(width, height)
    if (longest <= maxDim && file.type === 'image/jpeg' && file.size < 300 * 1024) {
      return file
    }

    // Compute target dimensions preserving aspect ratio.
    let targetW = width
    let targetH = height
    if (longest > maxDim) {
      const scale = maxDim / longest
      targetW = Math.round(width * scale)
      targetH = Math.round(height * scale)
    }

    // Draw onto canvas at target size.
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // White background so transparent PNGs don't turn black when converted to JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(img, 0, 0, targetW, targetH)

    // Export as JPEG.
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
    const blob = dataUrlToBlob(compressedDataUrl)
    // Preserve the original filename but change extension to .jpg
    const baseName = (file.name || 'upload').replace(/\.[^/.]+$/, '')
    const newFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    return newFile
  } catch {
    // If anything goes wrong, return the original file so upload still works.
    return file
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Human-readable file size.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
