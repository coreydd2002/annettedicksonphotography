import { useEffect, useRef, useState } from "react";
import { IconClose } from "../../components/icons";

// Lets the admin choose which part of the album cover photo stays visible
// when AlbumGrid square-crops it (object-fit: cover) on the public
// Galleries page. The photo is shown at its true size; a draggable square
// frame marks the crop window, and its center (as a 0..1 fraction of the
// rendered image) becomes the photo's focusX/focusY.
export default function CoverCropEditor({ photo, onApply, onCancel }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null); // { pointerId, startClientX, startClientY, startLeft, startTop }
  const [imageSize, setImageSize] = useState(null); // rendered px, not natural
  const [focus, setFocus] = useState({
    x: photo.focusX ?? 0.5,
    y: photo.focusY ?? 0.5,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const measureImage = () => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    setImageSize({ width: rect.width, height: rect.height });
  };

  useEffect(() => {
    window.addEventListener("resize", measureImage);
    return () => window.removeEventListener("resize", measureImage);
  }, []);

  const frameSize = imageSize ? Math.min(imageSize.width, imageSize.height) : 0;
  const maxLeft = imageSize ? imageSize.width - frameSize : 0;
  const maxTop = imageSize ? imageSize.height - frameSize : 0;
  const frameLeft = imageSize
    ? Math.min(Math.max(focus.x * imageSize.width - frameSize / 2, 0), maxLeft)
    : 0;
  const frameTop = imageSize
    ? Math.min(Math.max(focus.y * imageSize.height - frameSize / 2, 0), maxTop)
    : 0;

  const updateFocusFromOffset = (left, top) => {
    if (!imageSize) return;
    const clampedLeft = Math.min(Math.max(left, 0), maxLeft);
    const clampedTop = Math.min(Math.max(top, 0), maxTop);
    setFocus({
      x: imageSize.width ? (clampedLeft + frameSize / 2) / imageSize.width : 0.5,
      y: imageSize.height ? (clampedTop + frameSize / 2) / imageSize.height : 0.5,
    });
  };

  const handlePointerDown = (event) => {
    if (!imageSize) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: frameLeft,
      startTop: frameTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updateFocusFromOffset(
      drag.startLeft + (event.clientX - drag.startClientX),
      drag.startTop + (event.clientY - drag.startClientY),
    );
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <div
      className="crop-picker"
      role="dialog"
      aria-modal="true"
      aria-label={`Position the cover crop for ${photo.title}`}
    >
      <div className="crop-picker-backdrop" onClick={onCancel} />
      <div className="crop-picker-panel">
        <button
          type="button"
          className="crop-picker-close"
          onClick={onCancel}
          aria-label="Close"
        >
          <IconClose />
        </button>

        <h2>Position the Cover Crop</h2>
        <p className="crop-picker-hint">
          Drag the square to choose what shows in the gallery.
        </p>

        <div className="crop-picker-image-wrap">
          <img
            ref={imageRef}
            src={photo.src}
            alt=""
            className="crop-picker-image"
            draggable={false}
            onLoad={measureImage}
          />
          {imageSize && (
            <div
              className="crop-picker-frame"
              style={{
                width: frameSize,
                height: frameSize,
                left: frameLeft,
                top: frameTop,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          )}
        </div>

        <div className="crop-picker-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApply({ focusX: focus.x, focusY: focus.y })}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
