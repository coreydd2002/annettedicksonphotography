import { Link } from "react-router-dom";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import "./AlbumGrid.css";

export default function AlbumGrid({ albums }) {
  return (
    <ul className="album-grid">
      {albums.map((album) => (
        <li key={album.id} className="album-grid-item">
          <Link
            to={`/albums/${album.id}`}
            className="album-tile"
            data-theme={album.category}
            aria-label={`View ${album.title} album — ${album.photoCount} photos`}
          >
            <PlaceholderImage
              src={album.coverPhoto?.src}
              alt={album.title}
              variant={getCategory(album.category)?.variant}
              aspect={album.coverPhoto?.aspect || "4 / 5"}
              className="album-tile-image"
            />
            <span className="album-tile-overlay">
              <span className="album-tile-title">{album.title}</span>
              <span className="album-tile-meta">
                {album.photoCount} {album.photoCount === 1 ? "Photo" : "Photos"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
