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

// Used to build photo ids: slugify(title) + "-" + uuid8, see blobUpload.js.
export function slugify(value) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "photo";
}
