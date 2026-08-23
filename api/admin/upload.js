import { randomUUID } from "node:crypto";
import { checkAuthHeader } from "../_lib/auth.js";
import { putFile } from "../_lib/github.js";

const CATEGORIES = new Set(["wedding", "portrait", "product"]);
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Vercel Node functions cap request bodies around 4.5MB, and base64 inflates
// binary size by ~37% — so the real ceiling on the original file is ~3MB.
// The admin upload form enforces this same number client-side so nothing
// gets a confusing "looked fine, failed on submit" experience.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ASPECT_PATTERN = /^\d+ \/ \d+$/;
const DATA_URL_PATTERN = /^data:([\w/+.-]+);base64,(.+)$/;

function slugify(value) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "photo";
}

// This only commits the image file — it does NOT touch content/gallery.json.
// The admin page stages new photos locally (so they show up in "Current
// Photos" immediately) and only writes the manifest when "Save and Redeploy"
// is clicked (see publish.js). That keeps each upload request small (well
// under Vercel's body-size limit even if several photos are added in one
// sitting) and means the public site's content doesn't actually change until
// the admin explicitly publishes.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, category, aspect, imageDataUrl } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!CATEGORIES.has(category)) {
    return res
      .status(400)
      .json({ error: "Category must be wedding, portrait, or product" });
  }
  if (typeof aspect !== "string" || !ASPECT_PATTERN.test(aspect)) {
    return res.status(400).json({ error: "Invalid aspect ratio" });
  }

  const match =
    typeof imageDataUrl === "string" ? imageDataUrl.match(DATA_URL_PATTERN) : null;
  if (!match) {
    return res.status(400).json({ error: "Missing or invalid image data" });
  }

  const [, mimeType, base64Data] = match;
  const ext = MIME_EXTENSIONS[mimeType];
  if (!ext) {
    return res
      .status(400)
      .json({ error: "Unsupported image type. Please use JPG, PNG, or WEBP." });
  }

  const decodedSize = Buffer.byteLength(base64Data, "base64");
  if (decodedSize > MAX_IMAGE_BYTES) {
    return res.status(400).json({
      error: "Please use a photo under 3MB — consider resizing or reducing quality.",
    });
  }

  const trimmedTitle = title.trim();
  const id = `${slugify(trimmedTitle)}-${randomUUID().slice(0, 8)}`;
  const imagePath = `public/gallery/${category}/${id}.${ext}`;
  const src = `/gallery/${category}/${id}.${ext}`;

  try {
    await putFile({
      path: imagePath,
      contentBase64: base64Data,
      message: `Add gallery photo: ${trimmedTitle}`,
    });
  } catch (error) {
    console.error("upload: failed to commit image", error);
    return res.status(502).json({ error: "Failed to upload the image to GitHub" });
  }

  return res.status(201).json({ item: { id, category, title: trimmedTitle, aspect, src } });
}
