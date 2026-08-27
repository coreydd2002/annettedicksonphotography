// Bento/mosaic packing: every photo is assigned whichever cell shape from a
// small vocabulary (1x1, 2x1 wide, 1x2 tall) crops it the least, placed
// into a fixed grid of equal-size cells with no permanent gaps. Occasional
// photos get opportunistically promoted to a 2x2 "featured" tile — never
// searched for, only ever applied when the spot already found for a 1x1
// happens to have 3 more free neighbors, so a "featured" tile can never
// strand a gap the way hunting for one to force-fit into would.

const DEFAULT_ASPECT = 4 / 5;

// Converts the API's "W / H" string into a numeric ratio, matching
// PlaceholderImage's own default for missing/malformed values.
export function parseAspectRatio(aspect) {
  if (typeof aspect === "number" && aspect > 0) return aspect;
  const match = /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(String(aspect ?? ""));
  if (!match) return DEFAULT_ASPECT;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  return w > 0 && h > 0 ? w / h : DEFAULT_ASPECT;
}

// Only these three are "natural" buckets a photo can pick on its own. 2x2
// (featured) is deliberately excluded — reserved for opportunistic
// promotion only, so it stays rare rather than the default for every
// square-ish photo.
const SHAPES = {
  "1x1": { colSpan: 1, rowSpan: 1 },
  "2x1": { colSpan: 2, rowSpan: 1 },
  "1x2": { colSpan: 1, rowSpan: 2 },
};
const NATURAL_KEYS = ["1x1", "2x1", "1x2"];

const cropLoss = (photoRatio, cellRatio) =>
  1 - Math.min(photoRatio / cellRatio, cellRatio / photoRatio);

export function computeBentoLayout(items, containerWidth, options = {}) {
  const { columns = 4, gap = 12, baseCellRatio = 4 / 5, featuredRate = 1 / 9 } = options;
  if (!items.length || containerWidth <= 0) return { tiles: [], columns, rowHeight: 0 };

  const colWidth = (containerWidth - gap * (columns - 1)) / columns;
  const rowHeight = colWidth / baseCellRatio;

  function shapeRatio(key) {
    const { colSpan, rowSpan } = SHAPES[key];
    return (
      (colSpan * colWidth + (colSpan - 1) * gap) / (rowSpan * rowHeight + (rowSpan - 1) * gap)
    );
  }
  const ratioByShape = Object.fromEntries(NATURAL_KEYS.map((key) => [key, shapeRatio(key)]));

  function naturalBucket(photoRatio) {
    return NATURAL_KEYS.map((key) => ({ key, loss: cropLoss(photoRatio, ratioByShape[key]) })).sort(
      (a, b) => a.loss - b.loss,
    )[0].key;
  }

  // Set<"row,col"> rather than a 2D array — total row count is unbounded
  // and grows as items place, so there's nothing sensible to pre-size.
  const occupied = new Set();
  let rowCount = 0;

  function cellsFree(row, col, colSpan, rowSpan) {
    if (col + colSpan > columns) return false;
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        if (occupied.has(`${row + dr},${col + dc}`)) return false;
      }
    }
    return true;
  }

  // Always restarts at (0,0) — nothing already placed is ever revisited or
  // undone. A shape that skips over a smaller leftover cell just leaves it
  // unclaimed; since every later call also starts from the top-left, the
  // next item whose shape fits that spot claims it automatically.
  // allowNewRows=false restricts the scan to rows that are ALREADY fully
  // part of the grid (row + rowSpan <= rowCount) — i.e. "reuse only,
  // never pioneer fresh territory."
  function scanForPosition(colSpan, rowSpan, allowNewRows) {
    const maxR = allowNewRows ? rowCount : rowCount - rowSpan;
    for (let r = 0; r <= maxR; r++) {
      for (let c = 0; c <= columns - colSpan; c++) {
        if (cellsFree(r, c, colSpan, rowSpan)) return { row: r, col: c };
      }
    }
    return null;
  }

  const tiles = [];

  function place(item, row, col, colSpan, rowSpan) {
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        occupied.add(`${row + dr},${col + dc}`);
      }
    }
    rowCount = Math.max(rowCount, row + rowSpan);
    tiles.push({
      id: item.id,
      col: col + 1, // 1-indexed to match CSS grid-column-start directly
      row: row + 1,
      colSpan,
      rowSpan,
      estimatedWidth: Math.round(colSpan * colWidth + (colSpan - 1) * gap),
    });
  }

  let placedCount = 0;
  let featuredCount = 0;

  // Opportunistic 2x2 promotion: never searched for, only ever applied at
  // the spot already found for this photo's natural 1x1 placement, and
  // only when that spot's neighbors are ALSO already free. A 2x2 block is
  // inherently harder to place safely than a 1-cell one, so extending it
  // into a brand-new row is only allowed when there's a comfortable
  // safety margin of items left (plenty of later placements to close
  // whatever it exposes via their own existing-rows-first preference,
  // same reasoning as step 3's "is this safely the final row" check,
  // just the opposite comfort zone). Extending into rows that are
  // already otherwise fully built out is always safe regardless of margin.
  function canPromote(pos, itemsRemaining) {
    if (pos.col + 1 >= columns) return false;
    if ((featuredCount + 1) / (placedCount + 1) > featuredRate) return false;
    if (pos.row + 2 > rowCount && itemsRemaining <= columns * 2) return false;
    return cellsFree(pos.row, pos.col, 2, 2);
  }

  items.forEach((item) => {
    const itemsRemaining = items.length - placedCount; // includes this item
    const ratio = parseAspectRatio(item.aspect);
    const natural = naturalBucket(ratio);
    const naturalShape = SHAPES[natural];

    // Step 1: try the natural shape, but only reusing rows that already
    // fully exist — never opens new territory. This is what keeps
    // multi-cell shapes from ever exposing a burst of fresh, hard-to-fill
    // cells: if it doesn't fit in what's already there, it doesn't get to
    // start something new on its own.
    let pos = scanForPosition(naturalShape.colSpan, naturalShape.rowSpan, false);
    if (pos) {
      if (natural === "1x1" && canPromote(pos, itemsRemaining)) {
        place(item, pos.row, pos.col, 2, 2);
        featuredCount++;
      } else {
        place(item, pos.row, pos.col, naturalShape.colSpan, naturalShape.rowSpan);
      }
      placedCount++;
      return;
    }

    // Step 2: the natural shape didn't fit anywhere in existing rows, but
    // a plain 1x1 might still fit an existing gap it was too big for.
    pos = scanForPosition(1, 1, false);
    if (pos) {
      place(item, pos.row, pos.col, 1, 1);
      placedCount++;
      return;
    }

    // Step 3: existing rows are provably 100% full — a new row is
    // unavoidable. A multi-cell shape is only safe to use for it if this
    // can be the grid's FINAL row (i.e. every remaining item, including
    // this one, could fit within one more row) — otherwise more rows are
    // still coming, and leaving this one incomplete while later rows fill
    // in would strand a mid-grid gap. Play it safe: one cell at a time.
    const isSafelyFinalRow = itemsRemaining <= columns;
    if (isSafelyFinalRow) {
      pos = scanForPosition(naturalShape.colSpan, naturalShape.rowSpan, true);
      place(item, pos.row, pos.col, naturalShape.colSpan, naturalShape.rowSpan);
    } else {
      pos = scanForPosition(1, 1, true);
      place(item, pos.row, pos.col, 1, 1);
    }
    placedCount++;
  });

  return { tiles, columns, rowHeight: Math.round(rowHeight) };
}
