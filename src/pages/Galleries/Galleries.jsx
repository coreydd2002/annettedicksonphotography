import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import GalleryGrid from "../../components/GalleryGrid/GalleryGrid";
import Lightbox from "../../components/Lightbox/Lightbox";
import galleryItems from "../../../content/gallery.json";
import "./Galleries.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "wedding", label: "Wedding" },
  { key: "portrait", label: "Portrait" },
  { key: "product", label: "Product" },
];

function resolveFilter(value) {
  return FILTERS.some((filter) => filter.key === value) ? value : "all";
}

export default function Galleries() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(() =>
    resolveFilter(searchParams.get("category")),
  );
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    setActiveFilter(resolveFilter(searchParams.get("category")));
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    return activeFilter === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const handleFilterChange = (key) => {
    setLightboxIndex(null);
    setSearchParams(key === "all" ? {} : { category: key });
  };

  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () =>
    setLightboxIndex(
      (index) => (index - 1 + filteredItems.length) % filteredItems.length,
    );
  const nextLightbox = () =>
    setLightboxIndex((index) => (index + 1) % filteredItems.length);

  return (
    <>
      <section className="section galleries-header">
        <div className="container">
          <span className="eyebrow">Portfolio</span>
          <h1>Galleries</h1>
          <p className="galleries-intro">
            A collection of weddings, portraits, and product work — each
            shaped around real moments and honest light.
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
          <GalleryGrid items={filteredItems} onItemClick={setLightboxIndex} />
        </div>
      </section>

      {lightboxIndex !== null && (
        <Lightbox
          items={filteredItems}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}
    </>
  );
}
