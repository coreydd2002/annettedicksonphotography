// Mirrors api/admin/upload.js's MAX_IMAGE_BYTES — kept in sync manually
// since client and serverless code aren't bundled together.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Set in sessionStorage the moment a publish succeeds, and consumed by
// App.jsx on the next full page load to redirect to Home. A hard refresh
// remounts the whole app, wiping React state, so the "we just redeployed"
// signal has to live somewhere that survives that — sessionStorage does,
// and clears itself once the tab closes.
export const REDEPLOY_REDIRECT_KEY = "adp_redeploy_redirect_pending";

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function detectImageAspect(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      URL.revokeObjectURL(url);
      if (!width || !height) {
        reject(new Error("Could not read image dimensions"));
        return;
      }
      const divisor = gcd(width, height);
      resolve(`${width / divisor} / ${height / divisor}`);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    image.src = url;
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

// Turns a bulk-uploaded filename into a reasonable default photo title,
// e.g. "garden_ceremony-01.jpg" -> "Garden Ceremony 01". Used by the "Add an
// Album" flow, which uploads several photos at once without asking for a
// title per file.
export function humanizeFilename(filename) {
  const withoutExt = filename.replace(/\.[^./\\]+$/, "");
  const spaced = withoutExt.replace(/[-_]+/g, " ").trim();
  const titleCased = spaced.replace(
    /\S+/g,
    (word) => word[0].toUpperCase() + word.slice(1).toLowerCase(),
  );
  return titleCased || "Untitled";
}
