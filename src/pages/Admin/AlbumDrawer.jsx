import { useEffect, useState } from "react";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { IconClose, IconDragHandle } from "../../components/icons";
import { getCategory } from "../../../shared/categories";
import AddPhotoModal from "./AddPhotoModal";

export default function AlbumDrawer({
  album,
  photos,
  authFetch,
  onClose,
  onRenameAlbum,
  onDeleteAlbumRequest,
  onRenamePhoto,
  onDeletePhotoRequest,
  onReorderPhotos,
  onPhotoAdded,
}) {
  const [titleDraft, setTitleDraft] = useState(album.title);
  const [renamingPhotoId, setRenamingPhotoId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Keep the draft in sync if the album changes out from under us (e.g. a
  // publish reloaded fresh data) without clobbering in-progress typing.
  useEffect(() => {
    setTitleDraft(album.title);
  }, [album.id, album.title]);

  useEffect(() => {
    if (addPhotoOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, addPhotoOpen]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== album.title) {
      onRenameAlbum(trimmed);
    } else {
      setTitleDraft(album.title);
    }
  };

  const startRenamePhoto = (photo) => {
    setRenamingPhotoId(photo.id);
    setRenameDraft(photo.title);
  };

  const commitRenamePhoto = (photo) => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== photo.title) {
      onRenamePhoto(photo.id, trimmed);
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

    const fromIndex = photos.findIndex((photo) => photo.id === sourceId);
    const toIndex = photos.findIndex((photo) => photo.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderPhotos(reordered);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const category = getCategory(album.category);

  return (
    <div
      className="admin-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${album.title}`}
    >
      <div className="admin-drawer-backdrop" onClick={onClose} />
      <div className="admin-drawer-panel" data-theme={album.category}>
        <button
          type="button"
          className="admin-drawer-close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose />
        </button>

        <span className="eyebrow">{category?.label || album.category}</span>
        <input
          type="text"
          className="admin-drawer-title-input"
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          aria-label="Album title"
        />

        <button
          type="button"
          className="btn btn-outline admin-drawer-add-btn"
          onClick={() => setAddPhotoOpen(true)}
        >
          Add Photo
        </button>

        {photos.length === 0 ? (
          <p className="admin-empty">No photos in this album yet.</p>
        ) : (
          <>
            <p className="admin-list-hint">Drag a photo to reorder it.</p>
            <ul className="admin-drawer-photo-list">
              {photos.map((photo) => (
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
                      onClick={() => onDeletePhotoRequest(photo)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <button
          type="button"
          className="btn btn-outline admin-drawer-delete-album"
          onClick={onDeleteAlbumRequest}
        >
          Delete Album
        </button>
      </div>

      {addPhotoOpen && (
        <AddPhotoModal
          album={album}
          authFetch={authFetch}
          onClose={() => setAddPhotoOpen(false)}
          onAdded={(item) => {
            onPhotoAdded(item);
            setAddPhotoOpen(false);
          }}
        />
      )}
    </div>
  );
}
