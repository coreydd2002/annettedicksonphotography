export { MAX_IMAGE_BYTES } from "../../../shared/images";

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

// Shared by photo ids (slugify(title) + "-" + uuid8, in blobUpload.js) and
// album ids (same pattern, generateAlbumId() in blobUpload.js).
export function slugify(value) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "photo";
}
