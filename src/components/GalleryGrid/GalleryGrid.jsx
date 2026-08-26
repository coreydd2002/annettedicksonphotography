import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import "./GalleryGrid.css";

export default function GalleryGrid({ items, onItemClick }) {
  return (
    <ul className="gallery-grid">
      {items.map((item, index) => (
        <li key={item.id} className="gallery-grid-item">
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
              optimizeWidth={640}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
