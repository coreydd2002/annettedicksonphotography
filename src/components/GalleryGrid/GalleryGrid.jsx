import { useEffect, useMemo, useRef, useState } from "react";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import { computeBentoLayout } from "./bentoLayout";
import "./GalleryGrid.css";

const GAP = 12;

// Column count by measured container width — same 480/768/1024
// breakpoints used elsewhere in this codebase, now controlling column
// COUNT rather than a continuous target row height.
function columnsFor(width) {
  if (width <= 480) return 2;
  if (width <= 768) return 3;
  if (width <= 1024) return 4;
  return 5;
}

export default function GalleryGrid({ items, onItemClick }) {
  const gridRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;

    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0].contentRect.width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setWidth((prev) => (Math.abs(prev - measured) > 2 ? measured : prev));
      });
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const { tileByID, columns, rowHeight } = useMemo(() => {
    if (!width) return { tileByID: new Map(), columns: columnsFor(0), rowHeight: 0 };
    const { tiles, columns, rowHeight } = computeBentoLayout(items, width, {
      columns: columnsFor(width),
      gap: GAP,
    });
    return { tileByID: new Map(tiles.map((t) => [t.id, t])), columns, rowHeight };
  }, [items, width]);

  return (
    <ul
      ref={gridRef}
      className="gallery-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridAutoRows: `${rowHeight}px`, gap: GAP }}
    >
      {items.map((item, index) => {
        const tile = tileByID.get(item.id);
        if (!tile) return null; // before first width measurement
        return (
          <li
            key={item.id}
            className="gallery-grid-item"
            style={{
              gridColumn: `${tile.col} / span ${tile.colSpan}`,
              gridRow: `${tile.row} / span ${tile.rowSpan}`,
            }}
          >
            <button
              type="button"
              className="gallery-tile"
              onClick={() => onItemClick(index)}
              aria-label={`View ${item.title}`}
            >
              <PlaceholderImage
                src={item.src}
                alt={item.title}
                variant={getCategory(item.category)?.variant}
                aspect={item.aspect}
                className="gallery-tile-image"
                optimizeWidth={tile.estimatedWidth > 640 ? 2400 : 640}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
