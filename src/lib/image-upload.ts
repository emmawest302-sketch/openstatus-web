/**
 * Getting a phone photo into the page, without the three things that break it.
 *
 * 1. SIZE. A serverless request body is capped at about 4.5 MB. An iPhone
 *    photo is routinely bigger, and the platform rejects it before any of our
 *    code runs — with a body that is not JSON, so `res.json()` threw Safari's
 *    "The string did not match the expected pattern." That is what an owner
 *    saw when she tried to upload her logo: a parser error, for a photo that
 *    was simply too big.
 *
 * 2. ORIENTATION. iPhones store the sensor's pixels and a separate EXIF flag
 *    saying which way up it was. Browsers honour that flag; the scrapers that
 *    build a link preview for a text message do not. So a portrait photo went
 *    out sideways in every shared link while looking upright everywhere the
 *    owner checked.
 *
 * 3. FORMAT. The camera roll hands back HEIC, which the upload route rejects.
 *
 * Drawing through a canvas fixes all three at once: it resamples to a sane
 * size, bakes the rotation into the pixels and drops the EXIF block that
 * carried it, and re-encodes as JPEG whatever went in.
 */

/** Longest edge we keep. A logo is shown at ~66px; a cover at ~560px wide. */
export const MAX_EDGE = { avatar: 768, header: 1800 } as const;

/**
 * Scale to fit inside `max` on the longest edge, never scaling up.
 *
 * Pure, and the only part worth testing: the rest is canvas plumbing that a
 * test would only mock back at itself.
 */
export function fitDimensions(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !(max > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  // At least 1px on the short edge, so a panorama never rounds itself away.
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Decode with EXIF applied, falling back for browsers without the option. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {/* HEIC on a browser that cannot decode it, or an old Safari */}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = url;
    });
    return img;
  } finally {
    // Revoking immediately is safe: the bitmap is already decoded into the
    // element, and holding the URL leaks for the life of the document.
    URL.revokeObjectURL(url);
  }
}

/**
 * A JPEG, upright, small enough to upload. Returns a File so the caller's
 * FormData code is unchanged.
 */
export async function prepareImageForUpload(
  file: File,
  kind: 'avatar' | 'header',
): Promise<File> {
  const source = await decode(file);
  const sw = 'width' in source ? source.width : 0;
  const sh = 'height' in source ? source.height : 0;
  const { width, height } = fitDimensions(sw, sh, MAX_EDGE[kind]);
  if (!width || !height) throw new Error('That image has no size we can read.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser would not let us resize that image.');
  // White underneath, because a transparent PNG flattened onto nothing in a
  // JPEG comes out black.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ('close' in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.86),
  );
  if (!blob) throw new Error('That image could not be converted.');

  const base = file.name.replace(/\.[^.]+$/, '') || kind;
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}
