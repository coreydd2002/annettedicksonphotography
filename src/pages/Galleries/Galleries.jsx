import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AlbumGrid from "../../components/AlbumGrid/AlbumGrid";
import albums from "../../../content/albums.json";
import galleryItems from "../../../content/gallery.json";
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

  useEffect(() => {
    setActiveFilter(resolveFilter(searchParams.get("category")));
  }, [searchParams]);

  const enrichedAlbums = useMemo(() => {
    return albums.map((album) => {
      const photos = galleryItems.filter((item) => item.albumId === album.id);
      return { ...album, coverPhoto: photos[0], photoCount: photos.length };
    });
  }, []);

  const filteredAlbums = useMemo(() => {
    return activeFilter === "all"
      ? enrichedAlbums
      : enrichedAlbums.filter((album) => album.category === activeFilter);
  }, [activeFilter, enrichedAlbums]);

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
            A collection of weddings, portraits, family sessions,
            engagements, and product work — each shaped around real moments
            and honest light.
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
          <AlbumGrid albums={filteredAlbums} />
        </div>
      </section>
    </>
  );
}
