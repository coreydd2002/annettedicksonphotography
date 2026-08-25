import { useEffect, useState } from "react";
import {
  detectImageAspect,
  fileToDataUrl,
  humanizeFilename,
  MAX_IMAGE_BYTES,
} from "./utils";
import { CATEGORIES } from "../../../shared/categories";
import ConfirmDialog from "./ConfirmDialog";

let pendingFileCounter = 0;

// Mirrors AlbumDrawer's Save/Cancel pattern: nothing is created until
// "Save" is clicked, and Cancel confirms first if there's anything to lose
// (a typed name or selected photos). Unlike the drawer, there's no existing
// album to restore on cancel — cancelling just clears the form.
export default function AddAlbumPanel({ authFetch, onClose, onDirtyChange, onAlbumCreated }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [createdAlbum, setCreatedAlbum] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isDirty = title.trim() !== "" || pendingFiles.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    if (showCancelConfirm) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleCancelRequest();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelConfirm, isDirty]);

  const handlePendingFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const entries = await Promise.all(
      files.map(async (file) => {
        pendingFileCounter += 1;
        const id = `${Date.now()}-${pendingFileCounter}`;
        if (file.size > MAX_IMAGE_BYTES) {
          return { id, file, name: file.name, error: "Over 3MB" };
        }
        try {
          const aspect = await detectImageAspect(file);
          return { id, file, name: file.name, aspect };
        } catch {
          return { id, file, name: file.name, error: "Could not read image" };
        }
      }),
    );

    setPendingFiles((prev) => [...prev, ...entries]);
  };

  const removePendingFile = (id) => {
    setPendingFiles((prev) => prev.filter((entry) => entry.id !== id));
  };

  const canSave =
    title.trim() && pendingFiles.some((entry) => !entry.error) && status !== "submitting";

  // Creates the album (via the first upload) and uploads every valid
  // pending photo to it, one at a time. Each successfully uploaded photo
  // (and the newly created album, the first time) is handed up via
  // onAlbumCreated immediately — so a failure partway through still leaves
  // whatever succeeded staged, and retrying "Save" continues into the
  // same album rather than creating a duplicate.
  const handleSave = async () => {
    if (!canSave) return;

    const validEntries = pendingFiles.filter((entry) => !entry.error);
    setStatus("submitting");
    setError("");

    let album = createdAlbum;
    const albumIsNew = !album;
    const succeededIds = new Set();
    const newItems = [];
    let uploadError = "";

    for (const entry of validEntries) {
      try {
        const imageDataUrl = await fileToDataUrl(entry.file);
        const body = album
          ? {
              title: humanizeFilename(entry.name),
              aspect: entry.aspect,
              imageDataUrl,
              albumId: album.id,
              category: album.category,
            }
          : {
              title: humanizeFilename(entry.name),
              aspect: entry.aspect,
              imageDataUrl,
              newAlbum: { title: title.trim(), category },
            };

        const response = await authFetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
          uploadError = data.error || "Something went wrong uploading one of the photos.";
          break;
        }

        if (data.album) album = data.album;
        newItems.push(data.item);
        succeededIds.add(entry.id);
      } catch {
        uploadError = "Something went wrong uploading one of the photos.";
        break;
      }
    }

    if (album && albumIsNew) setCreatedAlbum(album);
    setPendingFiles((prev) => prev.filter((entry) => !succeededIds.has(entry.id)));
    if (newItems.length) {
      onAlbumCreated({ album: albumIsNew ? album : null, items: newItems });
    }

    if (uploadError) {
      setStatus("error");
      setError(uploadError);
    } else {
      setStatus("idle");
      onClose();
    }
  };

  const handleCancelRequest = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <div aria-label="Add a new album">
      <span className="eyebrow">New Album</span>
      <h2>Add an Album</h2>

      {status === "error" && (
        <p className="form-banner form-banner-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-upload-form">
        <div className="form-row">
          <label htmlFor="admin-new-album-title">Album Name</label>
          <input
            id="admin-new-album-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="admin-new-album-category">Photoshoot Type</label>
          <select
            id="admin-new-album-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {CATEGORIES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="admin-new-album-files">Photos</label>
          <input
            id="admin-new-album-files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePendingFilesChange}
          />
        </div>

        {pendingFiles.length > 0 && (
          <ul className="admin-pending-files">
            {pendingFiles.map((entry) => (
              <li
                key={entry.id}
                className={`admin-pending-file ${entry.error ? "has-error" : ""}`}
              >
                <span className="admin-pending-file-name">{entry.name}</span>
                {entry.error && (
                  <span className="admin-pending-file-error">{entry.error}</span>
                )}
                <button
                  type="button"
                  className="admin-pending-file-remove"
                  onClick={() => removePendingFile(entry.id)}
                  aria-label={`Remove ${entry.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-drawer-save-row">
        <button type="button" className="btn btn-outline" onClick={handleCancelRequest}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!canSave}
        >
          {status === "submitting" ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="admin-drawer-save-note">
        <em>Saving doesn&rsquo;t redeploy the live site yet — use &ldquo;Save and
        Redeploy&rdquo; above when you&rsquo;re ready to publish.</em>
      </p>

      {showCancelConfirm && (
        <ConfirmDialog
          title="Discard this new album?"
          message="You have unsaved changes to this new album. Are you sure you want to discard them?"
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
