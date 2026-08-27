import { handleUpload } from "@vercel/blob/client";
import { verifyToken } from "../_lib/auth.js";
import { ALLOWED_CONTENT_TYPES, MAX_IMAGE_BYTES } from "../../shared/images.js";

// Matches photos/{photoId}.{ext} — the id is always slugify()'d
// client-side, so this is deliberately strict.
const PATH_PATTERN = /^photos\/[a-z0-9-]+\.(jpg|png|webp)$/;

// The token-exchange endpoint behind client-direct Blob uploads: the
// browser uploads the image straight to Vercel Blob, never through this
// (or any) serverless function's body — that's what removes the old
// 3MB-per-photo ceiling. This file's only job is to authorize the upload
// and hand back a short-lived client token.
//
// IMPORTANT — auth works differently here than every other api/admin/*.js
// file: the browser's internal request to this endpoint (made by
// @vercel/blob/client's upload()) carries no Authorization header, so
// checkAuthHeader(req) can't be used. The admin's bearer token is instead
// threaded through via `clientPayload` (see src/pages/Admin/blobUpload.js)
// and verified below, inside onBeforeGenerateToken — that's the only
// enforcement point before a client token is minted. Skipping it would let
// anyone upload to the store.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        let payload = {};
        try {
          payload = JSON.parse(clientPayloadRaw || "{}");
        } catch {
          // fall through to the unauthenticated case below
        }
        if (!verifyToken(payload.token).ok) {
          throw new Error("Unauthorized");
        }
        if (!PATH_PATTERN.test(pathname)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: false,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
        };
      },
      // Best-effort only — this webhook doesn't fire against localhost
      // without a tunneling tool, and this app doesn't rely on it: the
      // browser stages the photo in React state as soon as upload()
      // resolves, same as every other staged-until-Publish edit here.
      onUploadCompleted: async ({ blob }) => {
        console.log("blob upload completed", blob.url);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    // Vercel retries this webhook up to 5 times waiting for a 200.
    return res.status(400).json({ error: error.message });
  }
}
