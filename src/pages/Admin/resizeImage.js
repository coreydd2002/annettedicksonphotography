import { MIME_EXTENSIONS } from "../../../shared/images";

// The long-edge ceiling for a stored photo. No browser renders more than
// this even full-screen on a high-DPI display, and the gallery grid is
// downscaled much further at request time by Vercel's image proxy (see
// vercel.json). Anything larger in Blob is bytes nobody ever sees — which
// is what filled the store in Aug 2026 when full 6000px / 10-20MB camera
// originals were being uploaded untouched.
const MAX_EDGE = 2560;

// Re-encode everything to JPEG at this quality. The ~10x size drop comes
// mostly from the downscale, not the codec; 0.9 keeps recompression
// artifacts invisible at web sizes. Output is always JPEG regardless of
// input format, so the Blob path always ends in this extension.
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;
export const OUTPUT_EXT = MIME_EXTENSIONS[OUTPUT_TYPE]; // "jpg"

// Downscales a camera-original image to MAX_EDGE on its long edge and
// re-encodes it as a compact JPEG, entirely in the browser — the result
// is a plain File, so the caller still uploads it straight to Blob with
// no serverless function in the path (see blobUpload.js). A 12MB / 6000px
// original comes out around 1-2MB / 2560px with no quality loss visible
// at web sizes. Images already within MAX_EDGE are still re-encoded so
// output size and format stay predictable.
//
// EXIF orientation is baked into the pixels (imageOrientation:
// "from-image") and all other metadata is dropped, matching how the
// aspect ratio is measured in utils.js. Transparency is flattened onto
// white so PNG sources don't pick up a black background from the JPEG.
export async function resizeImageForUpload(file) {
  let probe;
  try {
    probe = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Could not read that image file.");
  }
  const { width, height } = probe;
  probe.close();

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  // resizeQuality: "high" asks the browser for its best downsampler.
  // Browsers that don't honour the resize hints hand back a full-size
  // bitmap instead, so the drawImage below always specifies the source
  // and destination rectangles explicitly and scales there as a fallback.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
    resizeWidth: targetW,
    resizeHeight: targetH,
    resizeQuality: "high",
  });

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not process that image."))),
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  });

  return new File([blob], `photo.${OUTPUT_EXT}`, { type: OUTPUT_TYPE });
}
