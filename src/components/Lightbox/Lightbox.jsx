import { useEffect } from "react";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import { IconClose, IconChevronLeft, IconChevronRight } from "../icons";
import { getCategory } from "../../../shared/categories";
import "./Lightbox.css";

export default function Lightbox({ items, currentIndex, onClose, onPrev, onNext }) {
  const item = items[currentIndex];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!item) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="lightbox-backdrop" onClick={onClose} />

      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        <IconClose />
      </button>

      <button
        type="button"
        className="lightbox-nav lightbox-prev"
        onClick={onPrev}
        aria-label="Previous photo"
      >
        <IconChevronLeft />
      </button>

      <div className="lightbox-content">
        <PlaceholderImage
          src={item.src}
          alt={item.title}
          variant={getCategory(item.category)?.variant}
          aspect={item.aspect}
          className="lightbox-image"
        />
        <p className="lightbox-caption">
          <span className="lightbox-title">{item.title}</span>
        </p>
      </div>

      <button
        type="button"
        className="lightbox-nav lightbox-next"
        onClick={onNext}
        aria-label="Next photo"
      >
        <IconChevronRight />
      </button>
    </div>
  );
}
