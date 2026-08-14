import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
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
            aria-label={`View ${item.title} — ${item.category}`}
          >
            <PlaceholderImage
              src={item.src}
              alt={item.title}
              variant={item.variant}
              aspect={item.aspect}
              className="gallery-tile-image"
            />
            <span className="gallery-tile-overlay">
              <span className="gallery-tile-title">{item.title}</span>
              <span className="gallery-tile-category">{item.category}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
