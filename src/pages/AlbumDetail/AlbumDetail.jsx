import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GalleryGrid from "../../components/GalleryGrid/GalleryGrid";
import Lightbox from "../../components/Lightbox/Lightbox";
import NotFound from "../NotFound/NotFound";
import { getCategory } from "../../../shared/categories";
import "./AlbumDetail.css";

export default function AlbumDetail() {
  const { slug } = useParams();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | idle | notFound | error

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setAlbum(null);
    setPhotos([]);

    fetch(`/api/albums/${slug}`)
      .then(async (response) => {
        if (response.status === 404) {
          if (!cancelled) setStatus("notFound");
          return null;
        }
        if (!response.ok) throw new Error("Failed to load album");
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setAlbum(data.album);
        setPhotos(data.photos || []);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () =>
    setLightboxIndex((index) => (index - 1 + photos.length) % photos.length);
  const nextLightbox = () =>
    setLightboxIndex((index) => (index + 1) % photos.length);

  if (status === "notFound") {
    return <NotFound />;
  }

  if (status === "loading") {
    return (
      <section className="section album-detail-header">
        <div className="container">
          <p className="album-detail-empty">Loading…</p>
        </div>
      </section>
    );
  }

  if (status === "error" || !album) {
    return (
      <section className="section album-detail-header">
        <div className="container">
          <p className="album-detail-empty">
            Couldn&rsquo;t load this album right now — please try again soon.
          </p>
        </div>
      </section>
    );
  }

  const category = getCategory(album.category);

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
