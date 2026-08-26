// Single source of truth for the album title length cap, shared by the
// admin's title inputs (src/pages/Admin/) and AlbumGrid's display sizing.
// Same "code, not data" reasoning as shared/categories.js.

// AlbumGrid reserves a fixed two-line box for every title (see
// .album-tile-title's min-height/line-clamp in AlbumGrid.css) so tiles
// stay a consistent height whether a title is short or long. This cap is
// what keeps a title from actually needing that 3rd clamped line: at the
// title's 1.6rem Cormorant Garamond, averaging ~0.46em per character, the
// grid's narrowest real tile (its 260px minimum column, minus the frame's
// 10px side padding) fits ~20 characters per line — 40 for two lines.
export const MAX_ALBUM_TITLE_LENGTH = 40;
