import { upload } from "@vercel/blob/client";
import { slugify } from "./utils";
import { MIME_EXTENSIONS } from "../../../shared/images";
import { resizeImageForUpload, OUTPUT_EXT } from "./resizeImage";

// Uploads a photo straight from the browser to Vercel Blob storage,
// bypassing any serverless function body entirely — see
// api/admin/blob-upload.js for the server-side half of this handshake
// (which is also where the admin's bearer token actually gets checked,
// since it's threaded through as `clientPayload` here rather than a
// header). The image is downscaled and recompressed in the browser first
// (see resizeImage.js) so Blob only ever holds web-display-sized files,
// not full camera originals. Returns what callers need to create the
// photo's database row: a generated id and the final public URL.
export async function uploadPhotoBlob({ file, title, token }) {
  if (!MIME_EXTENSIONS[file.type]) {
    throw new Error("Unsupported image type. Please use JPG, PNG, or WEBP.");
  }

  const id = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
  const resized = await resizeImageForUpload(file);
  const blob = await upload(`photos/${id}.${OUTPUT_EXT}`, resized, {
    access: "public",
    handleUploadUrl: "/api/admin/blob-upload",
    clientPayload: JSON.stringify({ token }),
  });

  return { id, src: blob.url };
}
