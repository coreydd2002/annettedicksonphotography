// Single source of truth for the shoot-type category enum, shared by the
// Vite frontend (src/) and the Vercel Node functions (api/). This is CODE,
// checked into git and deployed with the app — unlike the `albums`/`photos`
// tables in Postgres, which are DATA the admin panel reads/writes live via
// api/_lib/db.js. The category CHECK constraints in db/schema.sql must be
// kept in sync with this list by hand — SQL can't import a JS file.
//
// `variant` (0-4) maps each category to one of PlaceholderImage's five
// gradient backgrounds (see PlaceholderImage.css), which are themed to match
// these same categories' accent colors (see src/styles/global.css).

export const CATEGORIES = [
  { key: "wedding", label: "Wedding", variant: 0 },
  { key: "portrait", label: "Portrait", variant: 1 },
  { key: "product", label: "Product", variant: 2 },
  { key: "family", label: "Family", variant: 3 },
];

export const CATEGORY_KEYS = new Set(CATEGORIES.map((category) => category.key));

export function getCategory(key) {
  return CATEGORIES.find((category) => category.key === key);
}
