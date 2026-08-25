import { upload } from "@vercel/blob/client";
import { slugify } from "./utils";
import { MIME_EXTENSIONS } from "../../../shared/images";

// Uploads a photo straight from the browser to Vercel Blob storage,
// bypassing any serverless function body entirely — see
// api/admin/blob-upload.js for the server-side half of this handshake
// (which is also where the admin's bearer token actually gets checked,
// since it's threaded through as `clientPayload` here rather than a
// header). Returns what callers need to stage the photo locally: a
// generated id and the final public URL.
export async function uploadPhotoBlob({ file, title, albumId, token }) {
  const ext = MIME_EXTENSIONS[file.type];
  if (!ext) {
    throw new Error("Unsupported image type. Please use JPG, PNG, or WEBP.");
  }

  const id = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
  const blob = await upload(`albums/${albumId}/${id}.${ext}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/blob-upload",
    clientPayload: JSON.stringify({ token }),
  });

  return { id, src: blob.url };
}

// Album ids are generated the same way photo ids are (slugify + short
// random suffix) — album creation is no longer a server round-trip, since
// a photo's blob path needs an albumId to exist before the first upload.
export function generateAlbumId(title) {
  return `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
}
