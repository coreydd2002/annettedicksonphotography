import { useEffect, useState } from "react";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import Lightbox from "../../components/Lightbox/Lightbox";
import { IconEdit, IconFrame, IconTrash } from "../../components/icons";
import { getCategory } from "../../../shared/categories";
import { detectImageAspect, MAX_IMAGE_BYTES } from "./utils";
import { uploadPhotoBlob } from "./blobUpload";
import ConfirmDialog from "./ConfirmDialog";

const MAX_IMAGE_MB_LABEL = `${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`;

// A persistent panel (not an overlay) that lives inline in the admin grid,
// so the rest of the page stays interactive while it's open — e.g. clicking
// a different album's edit button just swaps this panel's contents.
//
// Everything in here (title, reorder, deletes, newly added photos) is a
// local draft — nothing reaches the database until "Upload Changes" is
// clicked, which pushes it live immediately (see onSave, wired to
// Admin.jsx's saveAlbumEdits). Because switching albums or discarding
// would silently drop that in-flight draft, anything that could lose it
// (Cancel, or the parent swapping albums out from under a dirty draft) is
// confirmed first.
export default function AlbumDrawer({
  album,
  photos,
  token,
  onClose,
  onDirtyChange,
  onDeleteAlbumRequest,
  onSave,
}) {
  const [draftTitle, setDraftTitle] = useState(album.title);
  const [draftPhotos, setDraftPhotos] = useState(photos);
  const [addPhotoStatus, setAddPhotoStatus] = useState("idle"); // idle | uploading | error
  const [addPhotoError, setAddPhotoError] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | error
  const [saveError, setSaveError] = useState("");
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const isDirty =
    draftTitle.trim() !== album.title ||
    JSON.stringify(draftPhotos) !== JSON.stringify(photos);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // Moves a photo to the front of the list, making it the album's cover —
  // the only reordering the list supports now that drag-to-reorder is gone.
  const handleMakeCover = (photoId) => {
    setDraftPhotos((prev) => {
      const index = prev.findIndex((photo) => photo.id === photoId);
      if (index <= 0) return prev;
      const next = [...prev];
      const [photo] = next.splice(index, 1);
      next.unshift(photo);
      return next;
    });
  };

  // Fires the instant a file is chosen from the native picker — no
  // in-between popup to confirm or add a title to, unlike the old
  // AddPhotoModal flow this replaced.
  const handleAddPhotoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAddPhotoError("");

    if (file.size > MAX_IMAGE_BYTES) {
      setAddPhotoStatus("error");
      setAddPhotoError(
        `Please use a photo under ${MAX_IMAGE_MB_LABEL} — consider resizing or reducing quality.`,
      );
      return;
    }

    setAddPhotoStatus("uploading");
    try {
      const aspect = await detectImageAspect(file);
      const { id, src } = await uploadPhotoBlob({
        file,
        title: file.name,
        albumId: album.id,
        token,
      });
      setDraftPhotos((prev) => [
        ...prev,
        { id, albumId: album.id, category: album.category, title: file.name, aspect, src },
      ]);
      setAddPhotoStatus("idle");
    } catch (err) {
      setAddPhotoStatus("error");
      setAddPhotoError(err.message || "Something went wrong — please try again.");
    }
  };

  const handleCancelRequest = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    const trimmedTitle = draftTitle.trim() || album.title;
    if (!isDirty) {
      onClose();
      return;
    }

    setSaveStatus("saving");
    setSaveError("");
    try {
      await onSave({ title: trimmedTitle, photos: draftPhotos });
      onClose();
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err.message || "Could not upload changes — please try again.");
    }
  };

  useEffect(() => {
    if (
      addPhotoStatus === "uploading" ||
      saveStatus === "saving" ||
      deleteConfirmPhoto ||
      showCancelConfirm ||
      lightboxIndex !== null
    ) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleCancelRequest();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addPhotoStatus, saveStatus, deleteConfirmPhoto, showCancelConfirm, lightboxIndex, isDirty]);

  const category = getCategory(album.category);

  return (
    <div data-theme={album.category} aria-label={`Edit ${album.title}`}>
      <span className="eyebrow">{category?.label || album.category}</span>
      <div className="admin-drawer-title-row">
        <IconEdit className="admin-drawer-title-icon" aria-hidden="true" />
        <input
          type="text"
          className="admin-drawer-title-input"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          aria-label="Album title"
        />
      </div>

      {draftPhotos.length === 0 ? (
        <p className="admin-empty">No photos in this album yet.</p>
      ) : (
        <>
          <p className="admin-list-hint">
            The first photo is the album&rsquo;s cover — click the frame icon on
            another photo to make it the cover instead.
          </p>
          <ul className="admin-drawer-photo-list">
            {draftPhotos.map((photo, index) => (
              <li key={photo.id} className="admin-photo-card">
                <span className="admin-make-cover-slot">
                  {index !== 0 && (
                    <button
                      type="button"
                      className="admin-make-cover-btn"
                      onClick={() => handleMakeCover(photo.id)}
                      aria-label={`Make ${photo.title} the album cover`}
                      title="Make album cover"
                    >
                      <IconFrame />
                    </button>
                  )}
                </span>
                <div className="admin-photo-thumb-wrap">
                  {index === 0 && (
                    <span className="admin-cover-badge">Album Cover</span>
                  )}
                  <button
                    type="button"
                    className={`admin-thumb-btn ${index === 0 ? "is-cover" : ""}`}
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`View ${photo.title}`}
                  >
                    <PlaceholderImage
                      src={photo.src}
                      alt={photo.title}
                      variant={getCategory(photo.category)?.variant}
                      aspect={photo.aspect}
                      draggable={false}
                      className="admin-photo-thumb"
                    />
                  </button>
                </div>
                <div className="admin-photo-meta">
                  <span className="admin-photo-title">{photo.title}</span>
                </div>
                <div className="admin-photo-actions">
                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => setDeleteConfirmPhoto(photo)}
                    aria-label={`Delete ${photo.title}`}
                    title="Delete photo"
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <label
        className={`admin-add-photo-slot ${
          addPhotoStatus === "uploading" ? "is-uploading" : ""
        }`}
      >
        <input
          type="file"
          className="admin-add-photo-input"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAddPhotoFile}
          disabled={addPhotoStatus === "uploading"}
        />
        <span className="admin-add-photo-icon" aria-hidden="true" />
        {addPhotoStatus === "uploading" ? "Uploading…" : "Add Photo"}
      </label>
      {addPhotoStatus === "error" && (
        <p className="admin-file-error">{addPhotoError}</p>
      )}

      {saveStatus === "error" && (
        <p className="form-banner form-banner-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="admin-drawer-save-row">
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleCancelRequest}
          disabled={saveStatus === "saving"}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? "Uploading…" : "Upload Changes"}
        </button>
      </div>

      <div className="admin-drawer-delete-album-row">
        <button
          type="button"
          className="btn btn-outline admin-drawer-delete-album"
          onClick={onDeleteAlbumRequest}
        >
          Delete Album
        </button>
      </div>

      {deleteConfirmPhoto && (
        <ConfirmDialog
          title="Delete photo?"
          message={`Remove "${deleteConfirmPhoto.title}" from this album?`}
          confirmLabel="Delete Photo"
          onConfirm={() => {
            setDraftPhotos((prev) => prev.filter((p) => p.id !== deleteConfirmPhoto.id));
            setDeleteConfirmPhoto(null);
          }}
          onCancel={() => setDeleteConfirmPhoto(null)}
        />
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="You have unsaved changes to this album. Are you sure you want to discard them?"
          confirmLabel="Discard Changes"
          onConfirm={() => {
            setShowCancelConfirm(false);
            onClose();
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={draftPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) => (i - 1 + draftPhotos.length) % draftPhotos.length)
          }
          onNext={() => setLightboxIndex((i) => (i + 1) % draftPhotos.length)}
        />
      )}
    </div>
  );
}
