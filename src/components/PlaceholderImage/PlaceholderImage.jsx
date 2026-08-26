import { useEffect, useState } from "react";
import "./PlaceholderImage.css";
import { IconImage } from "../icons";

// Vercel's built-in resizing proxy (configured in vercel.json) — routes a
// grid thumbnail through a small derivative instead of the full-resolution
// original, at a quality high enough that nothing is visibly lost. Skipped
// in local dev since `/_vercel/image` isn't served by the plain Vite dev
// server, and skipped whenever a caller (e.g. the Lightbox) wants the
// untouched original — see optimizeWidth's doc comment below.
function optimizedSrc(src, width) {
  if (!width || import.meta.env.DEV) return src;
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=90`;
}

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
  // Pass this for small grid tiles (album covers, gallery thumbnails) to
  // request a resized derivative sized for that tile rather than
  // downloading the full camera original just to shrink it in CSS. Must
  // match a width listed in vercel.json's images.sizes. Leave unset for
  // any view meant to show the photo at full quality (e.g. the Lightbox).
  optimizeWidth,
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
        src={optimizedSrc(src, optimizeWidth)}
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
