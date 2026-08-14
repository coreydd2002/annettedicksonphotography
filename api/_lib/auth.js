// Stateless admin auth: no session store, no database, no JWT library.
// A token is `${base64url(JSON payload)}.${base64url(HMAC-SHA256 signature)}`.
// Every /api/admin/* handler (except login) re-verifies the signature and
// expiry on each request — there is nothing to look up server-side.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function sign(payload) {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_TOKEN_SECRET is not configured");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Hash both sides to a fixed-length digest before comparing, so
// timingSafeEqual never throws on a length mismatch and never leaks
// the real secret's length via an early exception.
function safeEqual(a, b) {
  const digestA = createHash("sha256").update(String(a)).digest();
  const digestB = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(digestA, digestB);
}

export function signToken() {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString(
    "base64url",
  );
  const signature = sign(payload);
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { ok: false, reason: "malformed" };
  }

  const [payload, signature] = parts;
  let expectedSignature;
  try {
    expectedSignature = sign(payload);
  } catch {
    return { ok: false, reason: "misconfigured" };
  }

  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "bad-signature" };
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

export function checkAuthHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return false;
  }
  return verifyToken(token).ok;
}

export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") {
    return false;
  }
  return safeEqual(password, expected);
}
