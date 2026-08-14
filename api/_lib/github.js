// Thin wrapper around GitHub's Contents API. This IS the persistence layer
// for the admin gallery manager — no database, just files + commits.
const GITHUB_API = "https://api.github.com";
const USER_AGENT = "annette-dickson-admin";
const COMMITTER = {
  name: "Gallery Admin",
  email: "admin@annettedickson.photography",
};

export const MANIFEST_PATH = "content/gallery.json";

function config() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!owner || !repo || !token) {
    throw new Error(
      "GitHub integration is not configured (GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN)",
    );
  }

  return { owner, repo, token, branch };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };
}

function contentsUrl({ owner, repo }, path) {
  return `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
}

async function githubError(response, context) {
  const text = await response.text();
  const error = new Error(`GitHub ${context} failed: ${response.status} ${text}`);
  error.status = response.status;
  return error;
}

export async function getFile(path) {
  const cfg = config();
  const url = `${contentsUrl(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const response = await fetch(url, { headers: authHeaders(cfg.token) });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await githubError(response, `getFile(${path})`);
  }

  const data = await response.json();
  return { contentBase64: data.content, sha: data.sha };
}

export async function putFile({ path, contentBase64, message, sha }) {
  const cfg = config();
  const body = {
    message,
    content: contentBase64,
    branch: cfg.branch,
    committer: COMMITTER,
  };
  if (sha) body.sha = sha;

  const response = await fetch(contentsUrl(cfg, path), {
    method: "PUT",
    headers: { ...authHeaders(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await githubError(response, `putFile(${path})`);
  }

  const data = await response.json();
  return { sha: data.content.sha };
}

export async function deleteFile({ path, sha, message }) {
  const cfg = config();
  const body = {
    message,
    sha,
    branch: cfg.branch,
    committer: COMMITTER,
  };

  const response = await fetch(contentsUrl(cfg, path), {
    method: "DELETE",
    headers: { ...authHeaders(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await githubError(response, `deleteFile(${path})`);
  }
}

export async function getManifest() {
  const file = await getFile(MANIFEST_PATH);
  if (!file) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }
  const items = JSON.parse(
    Buffer.from(file.contentBase64, "base64").toString("utf8"),
  );
  return { items, sha: file.sha };
}

export async function putManifest(items, sha, message) {
  const contentBase64 = Buffer.from(JSON.stringify(items, null, 2)).toString(
    "base64",
  );
  return putFile({ path: MANIFEST_PATH, contentBase64, message, sha });
}
