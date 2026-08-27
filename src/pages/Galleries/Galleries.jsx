import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import GalleryGrid from "../../components/GalleryGrid/GalleryGrid";
import Lightbox from "../../components/Lightbox/Lightbox";
import { CATEGORIES } from "../../../shared/categories";
import "./Galleries.css";

const FILTERS = [{ key: "all", label: "All" }, ...CATEGORIES];

function resolveFilter(value) {
  return FILTERS.some((filter) => filter.key === value) ? value : "all";
}

export default function Galleries() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(() =>
    resolveFilter(searchParams.get("category")),
  );
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | idle | error
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    setActiveFilter(resolveFilter(searchParams.get("category")));
    setLightboxIndex(null);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch("/api/photos")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load galleries");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPhotos(data.photos || []);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPhotos = useMemo(() => {
    return activeFilter === "all"
      ? photos
      : photos.filter((photo) => photo.category === activeFilter);
  }, [activeFilter, photos]);

  const handleFilterChange = (key) => {
    setSearchParams(key === "all" ? {} : { category: key });
  };

  return (
    <>
      <section className="section galleries-header">
        <div className="container">
          <span className="eyebrow">Portfolio</span>
          <h1>Galleries</h1>
          <p className="galleries-intro">
            A collection of weddings, portraits, family sessions, and
            product work — each shaped around real moments and honest
            light.
          </p>

          <div
            className="filter-tabs"
            role="tablist"
            aria-label="Gallery category"
          >
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.key}
                className={`filter-tab ${
                  activeFilter === filter.key ? "active" : ""
                }`}
                onClick={() => handleFilterChange(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section galleries-grid-section">
        <div className="container">
          {status === "error" ? (
            <p className="galleries-status">
              Couldn&rsquo;t load galleries right now — please try again soon.
            </p>
          ) : status === "loading" ? (
            <p className="galleries-status">Loading…</p>
          ) : filteredPhotos.length === 0 ? (
            <p className="galleries-status">No photos here yet — check back soon.</p>
          ) : (
            <GalleryGrid items={filteredPhotos} onItemClick={setLightboxIndex} />
          )}
        </div>
      </section>

      {lightboxIndex !== null && (
        <Lightbox
          items={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) => (i - 1 + filteredPhotos.length) % filteredPhotos.length)
          }
          onNext={() => setLightboxIndex((i) => (i + 1) % filteredPhotos.length)}
        />
      )}
    </>
  );
}
