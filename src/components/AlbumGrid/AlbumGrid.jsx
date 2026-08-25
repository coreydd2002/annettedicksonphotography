import { Link } from "react-router-dom";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import "./AlbumGrid.css";

// Number of "peeking" cards behind the cover — capped at 2 regardless of
// how many photos the album has, so a 40-photo wedding album doesn't fan
// out any wider than a 3-photo one.
function stackLayerCount(photoCount) {
  return Math.max(0, Math.min(2, photoCount - 1));
}

export default function AlbumGrid({ albums }) {
  return (
    <ul className="album-grid">
      {albums.map((album) => {
        const category = getCategory(album.category);
        const aspect = album.coverPhoto?.aspect || "4 / 5";
        const layers = stackLayerCount(album.photoCount);

        return (
          <li key={album.id} className="album-grid-item">
            <Link
              to={`/albums/${album.id}`}
              className="album-tile"
              data-theme={album.category}
              aria-label={`View ${album.title} album — ${album.photoCount} photos`}
            >
              {layers > 0 && (
                <span className="album-stack" aria-hidden="true">
                  {Array.from({ length: layers }, (_, index) => (
                    <span
                      key={index}
                      className={`album-stack-layer album-stack-layer-${index + 1}`}
                    >
                      <PlaceholderImage
                        src={album.coverPhoto?.src}
                        variant={category?.variant}
                        aspect={aspect}
                        showIcon={false}
                        className="album-stack-image"
                      />
                    </span>
                  ))}
                </span>
              )}
              <span className="album-tile-frame">
                <PlaceholderImage
                  src={album.coverPhoto?.src}
                  alt={album.title}
                  variant={category?.variant}
                  aspect={aspect}
                  className="album-tile-image"
                />
                <span className="album-tile-overlay">
                  <span className="album-tile-title">{album.title}</span>
                  <span className="album-tile-meta">
                    {album.photoCount} {album.photoCount === 1 ? "Photo" : "Photos"}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
