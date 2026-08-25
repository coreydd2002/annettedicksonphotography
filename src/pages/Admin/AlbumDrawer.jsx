import { useEffect, useState } from "react";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { IconDragHandle } from "../../components/icons";
import { getCategory } from "../../../shared/categories";
import AddPhotoModal from "./AddPhotoModal";
import ConfirmDialog from "./ConfirmDialog";

// A persistent panel (not an overlay) that lives inline in the admin grid,
// so the rest of the page stays interactive while it's open — e.g. clicking
// a different album's edit button just swaps this panel's contents.
//
// Everything in here (title, renames, reorder, deletes, newly added photos)
// is a local draft — nothing reaches the parent's staged items/albums until
// "Save" is clicked. Because switching albums or discarding would silently
// drop that draft, anything that could lose it (Cancel, or the parent
// swapping albums out from under a dirty draft) is confirmed first. This is
// still just local React state, one step removed from the live site: "Save"
// here only updates the admin's staged list — publishing still requires
// "Save and Redeploy" on the main screen.
export default function AlbumDrawer({
  album,
  photos,
  authFetch,
  onClose,
  onDirtyChange,
  onRenameAlbum,
  onDeleteAlbumRequest,
  onSavePhotos,
}) {
  const [draftTitle, setDraftTitle] = useState(album.title);
  const [draftPhotos, setDraftPhotos] = useState(photos);
  const [renamingPhotoId, setRenamingPhotoId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const isDirty =
    draftTitle.trim() !== album.title ||
    JSON.stringify(draftPhotos) !== JSON.stringify(photos);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const startRenamePhoto = (photo) => {
    setRenamingPhotoId(photo.id);
    setRenameDraft(photo.title);
  };

  const commitRenamePhoto = (photo) => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== photo.title) {
      setDraftPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, title: trimmed } : p)),
      );
    }
    setRenamingPhotoId(null);
  };

  const handleDragStart = (event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  };

  const handleDragOver = (event, id) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (id !== draggedId && dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (id) => {
    setDragOverId((current) => (current === id ? null : current));
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    setDragOverId(null);

    const sourceId = draggedId;
    setDraggedId(null);
    if (sourceId == null || sourceId === targetId) return;

    setDraftPhotos((prev) => {
      const fromIndex = prev.findIndex((photo) => photo.id === sourceId);
      const toIndex = prev.findIndex((photo) => photo.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleCancelRequest = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    const trimmedTitle = draftTitle.trim();
    if (trimmedTitle && trimmedTitle !== album.title) {
      onRenameAlbum(trimmedTitle);
    }
    if (JSON.stringify(draftPhotos) !== JSON.stringify(photos)) {
      onSavePhotos(draftPhotos);
    }
    onClose();
  };

  useEffect(() => {
    if (addPhotoOpen || deleteConfirmPhoto || showCancelConfirm) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleCancelRequest();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addPhotoOpen, deleteConfirmPhoto, showCancelConfirm, isDirty]);

  const category = getCategory(album.category);

  return (
    <div data-theme={album.category} aria-label={`Edit ${album.title}`}>
      <span className="eyebrow">{category?.label || album.category}</span>
      <input
        type="text"
        className="admin-drawer-title-input"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        aria-label="Album title"
      />

      <button
        type="button"
        className="btn btn-outline admin-drawer-add-btn"
        onClick={() => setAddPhotoOpen(true)}
      >
        Add Photo
      </button>

      {draftPhotos.length === 0 ? (
        <p className="admin-empty">No photos in this album yet.</p>
      ) : (
        <>
          <p className="admin-list-hint">Drag a photo to reorder it.</p>
          <ul className="admin-drawer-photo-list">
            {draftPhotos.map((photo) => (
              <li
                key={photo.id}
                className={`admin-photo-card ${
                  draggedId === photo.id ? "dragging" : ""
                } ${dragOverId === photo.id ? "drag-over" : ""}`}
                draggable
                onDragStart={(event) => handleDragStart(event, photo.id)}
                onDragOver={(event) => handleDragOver(event, photo.id)}
                onDragLeave={() => handleDragLeave(photo.id)}
                onDrop={(event) => handleDrop(event, photo.id)}
                onDragEnd={handleDragEnd}
              >
                <span className="admin-drag-handle" aria-label="Drag to reorder">
                  <IconDragHandle />
                </span>
                <PlaceholderImage
                  src={photo.src}
                  alt={photo.title}
                  variant={photo.variant}
                  aspect={photo.aspect}
                  draggable={false}
                  className="admin-photo-thumb"
                />
                <div className="admin-photo-meta">
                  {renamingPhotoId === photo.id ? (
                    <input
                      type="text"
                      className="admin-photo-rename-input"
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onBlur={() => commitRenamePhoto(photo)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label={`Rename ${photo.title}`}
                      autoFocus
                    />
                  ) : (
                    <span className="admin-photo-title">{photo.title}</span>
                  )}
                </div>
                <div className="admin-photo-actions">
                  <button
                    type="button"
                    className="btn btn-outline admin-rename-btn"
                    onClick={() => startRenamePhoto(photo)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline admin-delete-btn"
                    onClick={() => setDeleteConfirmPhoto(photo)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="admin-drawer-save-row">
        <button type="button" className="btn btn-outline" onClick={handleCancelRequest}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
      <p className="admin-drawer-save-note">
        <em>Saving doesn&rsquo;t redeploy the live site yet — use &ldquo;Save and
        Redeploy&rdquo; on the main screen when you&rsquo;re ready to publish.</em>
      </p>

      <button
        type="button"
        className="btn btn-outline admin-drawer-delete-album"
        onClick={onDeleteAlbumRequest}
      >
        Delete Album
      </button>

      {addPhotoOpen && (
        <AddPhotoModal
          album={album}
          authFetch={authFetch}
          onClose={() => setAddPhotoOpen(false)}
          onAdded={(item) => {
            setDraftPhotos((prev) => [...prev, item]);
            setAddPhotoOpen(false);
          }}
        />
      )}

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
    </div>
  );
}
