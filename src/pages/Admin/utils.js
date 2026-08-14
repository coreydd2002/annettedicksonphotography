// Mirrors api/admin/upload.js's MAX_IMAGE_BYTES — kept in sync manually
// since client and serverless code aren't bundled together.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

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
