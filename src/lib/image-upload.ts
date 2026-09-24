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

/**
 * Decode, with EXIF orientation applied.
 *
 * The object URL is NOT revoked here. It used to be, in a `finally` that ran
 * the moment the image finished loading — before the caller had drawn it to a
 * canvas. Chrome tolerates that; Safari can hand back a blank frame, so an
 * owner uploaded a logo and got a white square. The caller owns the URL now
 * and releases it after the draw.
 */
async function decode(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  release: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, release: () => bitmap.close() };
    } catch {/* HEIC on a browser that cannot decode it, or an old Safari */}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = url;
    });
    return { source: img, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * A small, upright image, ready to upload. Returns a File so the caller's
 * FormData code is unchanged.
 *
 * A logo keeps its transparency and stays a PNG: flattening a round mark onto
 * white and calling it a JPEG puts a white square behind every avatar. A cover
 * photo has no transparency worth keeping and is far larger, so it becomes a
 * JPEG, which is the whole reason this function exists.
 */
export async function prepareImageForUpload(
  file: File,
  kind: 'avatar' | 'header',
): Promise<File> {
  const { source, release } = await decode(file);
  try {
    const sw = source.width;
    const sh = source.height;
    const { width, height } = fitDimensions(sw, sh, MAX_EDGE[kind]);
    if (!width || !height) throw new Error('That image has no size we can read.');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser would not let us resize that image.');

    const keepAlpha = kind === 'avatar';
    if (!keepAlpha) {
      // A transparent PNG flattened onto nothing comes out black in a JPEG.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

    const type = keepAlpha ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, keepAlpha ? undefined : 0.86),
    );
    if (!blob || blob.size === 0) throw new Error('That image could not be converted.');

    const base = file.name.replace(/\.[^.]+$/, '') || kind;
    return new File([blob], `${base}.${keepAlpha ? 'png' : 'jpg'}`, { type });
  } finally {
    release();
  }
}
