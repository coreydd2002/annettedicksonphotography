import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import GalleryGrid from "../../components/GalleryGrid/GalleryGrid";
import Lightbox from "../../components/Lightbox/Lightbox";
import NotFound from "../NotFound/NotFound";
import albums from "../../../content/albums.json";
import galleryItems from "../../../content/gallery.json";
import { getCategory } from "../../../shared/categories";
import "./AlbumDetail.css";

export default function AlbumDetail() {
  const { slug } = useParams();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const album = albums.find((item) => item.id === slug);

  if (!album) {
    return <NotFound />;
  }

  const photos = galleryItems.filter((item) => item.albumId === album.id);
  const category = getCategory(album.category);

  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () =>
    setLightboxIndex((index) => (index - 1 + photos.length) % photos.length);
  const nextLightbox = () =>
    setLightboxIndex((index) => (index + 1) % photos.length);

  return (
    <>
      <section
        className="section album-detail-header"
        data-theme={album.category}
      >
        <div className="container">
          <span className="eyebrow">{category?.label || album.category}</span>
          <h1>{album.title}</h1>
          <p className="album-detail-count">
            {photos.length} {photos.length === 1 ? "Photo" : "Photos"}
          </p>
          <Link
            to={`/galleries?category=${album.category}`}
            className="btn btn-outline album-detail-back"
          >
            ← Back to Galleries
          </Link>
        </div>
      </section>

      <section
        className="section album-detail-grid-section"
        data-theme={album.category}
      >
        <div className="container">
          {photos.length === 0 ? (
            <p className="album-detail-empty">No photos in this album yet.</p>
          ) : (
            <GalleryGrid items={photos} onItemClick={setLightboxIndex} />
          )}
        </div>
      </section>

      {lightboxIndex !== null && (
        <Lightbox
          items={photos}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}
    </>
  );
}
