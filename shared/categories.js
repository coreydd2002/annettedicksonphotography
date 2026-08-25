// Single source of truth for the shoot-type category enum, shared by the
// Vite frontend (src/) and the Vercel Node functions (api/). This is CODE,
// checked into git and deployed with the app — unlike content/gallery.json
// and content/albums.json, which are DATA the admin panel rewrites live via
// GitHub's Contents API. Never import those two manifests directly from
// api/*.js; always go through getManifest()/putManifest() in
// api/_lib/github.js.
//
// `variant` (0-4) maps each category to one of PlaceholderImage's five
// gradient backgrounds (see PlaceholderImage.css), which are themed to match
// these same categories' accent colors (see src/styles/global.css).

export const CATEGORIES = [
  { key: "wedding", label: "Wedding", variant: 0 },
  { key: "portrait", label: "Portrait", variant: 1 },
  { key: "product", label: "Product", variant: 2 },
  { key: "family", label: "Family", variant: 3 },
  { key: "engagement", label: "Engagement", variant: 4 },
];

export const CATEGORY_KEYS = new Set(CATEGORIES.map((category) => category.key));

export function getCategory(key) {
  return CATEGORIES.find((category) => category.key === key);
}
