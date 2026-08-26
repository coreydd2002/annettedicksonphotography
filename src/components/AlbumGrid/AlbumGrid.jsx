import { Link } from "react-router-dom";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import "./AlbumGrid.css";

// Turns a photo's saved focal point (0..1 fractions, set via the admin's
// crop picker) into a CSS object-position value — defaults to centered for
// photos that have never had a custom crop point saved.
function focusToObjectPosition(photo) {
  const x = photo?.focusX ?? 0.5;
  const y = photo?.focusY ?? 0.5;
  return `${x * 100}% ${y * 100}%`;
}

export default function AlbumGrid({ albums }) {
  return (
    <ul className="album-grid">
      {albums.map((album) => {
        const category = getCategory(album.category);
        // Cropped to a uniform square here, purely for a tidy gallery grid —
        // the photos themselves keep their true aspect ratio once you're
        // inside the album (see GalleryGrid/Lightbox on AlbumDetail).
        const aspect = "1 / 1";

        return (
          <li key={album.id} className="album-grid-item">
            <Link
              to={`/albums/${album.id}`}
              className="album-tile"
              data-theme={album.category}
            >
              <span className="album-tile-media">
                <span className="album-tile-fan" aria-hidden="true"></span>
                <span className="album-tile-frame">
                  <PlaceholderImage
                    src={album.coverPhoto?.src}
                    alt={album.title}
                    variant={category?.variant}
                    aspect={aspect}
                    objectPosition={focusToObjectPosition(album.coverPhoto)}
                    className="album-tile-image"
                  />
                </span>
              </span>
              <span className="album-tile-caption">
                <span className="album-tile-title">{album.title}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
