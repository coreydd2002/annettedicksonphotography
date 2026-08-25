import { Link } from "react-router-dom";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { getCategory } from "../../../shared/categories";
import "./AlbumGrid.css";

export default function AlbumGrid({ albums }) {
  return (
    <ul className="album-grid">
      {albums.map((album) => {
        const category = getCategory(album.category);
        const aspect = album.coverPhoto?.aspect || "4 / 5";
        const stackPhotos = album.stackPhotos ?? [];

        return (
          <li key={album.id} className="album-grid-item">
            <Link
              to={`/albums/${album.id}`}
              className="album-tile"
              data-theme={album.category}
            >
              <span className="album-tile-media">
                {stackPhotos.length > 0 && (
                  <span className="album-stack" aria-hidden="true">
                    {stackPhotos.map((photo, index) => (
                      <span
                        key={photo.id}
                        className={`album-stack-layer album-stack-layer-${index + 1}`}
                      >
                        <PlaceholderImage
                          src={photo.src}
                          variant={category?.variant}
                          aspect={photo.aspect || aspect}
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
