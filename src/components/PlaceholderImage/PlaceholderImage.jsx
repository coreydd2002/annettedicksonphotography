import { useEffect, useState } from "react";
import "./PlaceholderImage.css";
import { IconImage } from "../icons";

export default function PlaceholderImage({
  src,
  alt = "",
  aspect = "4 / 5",
  objectPosition,
  variant = 0,
  label,
  showIcon = true,
  draggable,
  className = "",
}) {
  const [failed, setFailed] = useState(false);

  // Reset if a different src is passed in (e.g. list refreshes after upload).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Falls back to the gradient placeholder if there's no src yet, or the
  // real photo genuinely fails to load.
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={draggable}
        className={`placeholder-image ${className}`}
        style={{ aspectRatio: aspect, objectPosition }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`placeholder-image placeholder-image-variant-${
        variant % 5
      } ${className}`}
      style={{ aspectRatio: aspect }}
      role="img"
      aria-label={alt || label || "Placeholder photo"}
    >
      {showIcon && <IconImage className="placeholder-image-icon" />}
      {label && <span className="placeholder-image-label">{label}</span>}
    </div>
  );
}
