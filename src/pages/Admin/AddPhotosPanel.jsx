import { useState } from "react";
import { IconTrash } from "../../components/icons";
import { CATEGORIES } from "../../../shared/categories";
import { detectImageAspect, MAX_IMAGE_BYTES } from "./utils";
import { uploadPhotoBlob } from "./blobUpload";
import ConfirmDialog from "./ConfirmDialog";

let pendingFileCounter = 0;
const MAX_IMAGE_MB_LABEL = `${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`;

// Persistent side panel — always visible, not staged/dirty in the way the
// old per-album "workshop" was. Each staged photo needs its own category
// picked (defaulting to a blank placeholder, not one of the 4 real
// categories) before Upload is enabled, since photos are no longer
// grouped by album and so no longer inherit a category from one.
export default function AddPhotosPanel({ token, onPhotosAdded }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [error, setError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handlePendingFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const entries = await Promise.all(
      files.map(async (file) => {
        pendingFileCounter += 1;
        const id = `${Date.now()}-${pendingFileCounter}`;
        if (file.size > MAX_IMAGE_BYTES) {
          return { id, file, name: file.name, category: "", error: `Over ${MAX_IMAGE_MB_LABEL}` };
        }
        try {
          const aspect = await detectImageAspect(file);
          return { id, file, name: file.name, aspect, category: "" };
        } catch {
          return { id, file, name: file.name, category: "", error: "Could not read image" };
        }
      }),
    );

    setPendingFiles((prev) => [...prev, ...entries]);
  };

  const updateEntryCategory = (id, category) => {
    setPendingFiles((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, category } : entry)),
    );
  };

  const removePendingFile = (id) => {
    setPendingFiles((prev) => prev.filter((entry) => entry.id !== id));
  };

  const canUpload =
    pendingFiles.length > 0 &&
    pendingFiles.every((entry) => !entry.error && entry.category) &&
    status !== "uploading";

  // Uploads every valid staged file straight to Blob storage, one at a
  // time, then creates their database rows in a single call — a failure
  // partway through the upload loop still saves whatever succeeded, same
  // partial-failure tolerance the old per-album uploader had.
  const handleUpload = async () => {
    if (!canUpload) return;

    const validEntries = pendingFiles.filter((entry) => !entry.error && entry.category);
    setStatus("uploading");
    setError("");

    const succeededIds = new Set();
    const newPhotos = [];
    let uploadError = "";

    for (const entry of validEntries) {
      try {
        const { id, src } = await uploadPhotoBlob({ file: entry.file, title: entry.name, token });
        newPhotos.push({
          id,
          category: entry.category,
          title: entry.name,
          aspect: entry.aspect,
          src,
        });
        succeededIds.add(entry.id);
      } catch (err) {
        uploadError = err.message || "Something went wrong uploading one of the photos.";
        break;
      }
    }

    setPendingFiles((prev) => prev.filter((entry) => !succeededIds.has(entry.id)));

    if (newPhotos.length === 0) {
      setStatus("error");
      setError(uploadError || "Please add at least one photo.");
      return;
    }

    try {
      const response = await fetch("/api/admin/photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photos: newPhotos }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save the uploaded photos — please try again.");
      }
      onPhotosAdded(data.items);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Could not save the uploaded photos — please try again.");
      return;
    }

    if (uploadError) {
      setStatus("error");
      setError(uploadError);
    } else {
      setStatus("idle");
    }
  };

  const handleCancelRequest = () => {
    if (pendingFiles.length > 0) {
      setShowCancelConfirm(true);
    }
  };

  return (
    <div aria-label="Add Photos">
      <span className="eyebrow">Add</span>
      <h2>Add Photos</h2>

      {status === "error" && (
        <p className="form-banner form-banner-error" role="alert">
          {error}
        </p>
      )}

      {pendingFiles.length > 0 && (
        <ul className="admin-pending-files">
          {pendingFiles.map((entry) => (
            <li key={entry.id} className={`admin-pending-file ${entry.error ? "has-error" : ""}`}>
              <span className="admin-pending-file-name">{entry.name}</span>
              {entry.error ? (
                <span className="admin-pending-file-error">{entry.error}</span>
              ) : (
                <select
                  className={`admin-pending-file-category ${!entry.category ? "is-unset" : ""}`}
                  value={entry.category}
                  onChange={(event) => updateEntryCategory(entry.id, event.target.value)}
                  disabled={status === "uploading"}
                  aria-label={`Category for ${entry.name}`}
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="admin-pending-file-remove"
                onClick={() => removePendingFile(entry.id)}
                disabled={status === "uploading"}
                aria-label={`Remove ${entry.name}`}
                title="Remove"
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        className={`admin-add-photo-slot ${status === "uploading" ? "is-uploading" : ""}`}
      >
        <input
          type="file"
          className="admin-add-photo-input"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePendingFilesChange}
          disabled={status === "uploading"}
        />
        <span className="admin-add-photo-icon" aria-hidden="true" />
        {status === "uploading" ? "Uploading…" : "Add more photos"}
      </label>

      <div className="admin-drawer-save-row">
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleCancelRequest}
          disabled={pendingFiles.length === 0 || status === "uploading"}
        >
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={!canUpload}>
          {status === "uploading" ? "Uploading…" : "Upload"}
        </button>
      </div>

      {showCancelConfirm && (
        <ConfirmDialog
          title="Discard added photos?"
          message="You have photos staged to upload. Discard them?"
          confirmLabel="Discard"
          onConfirm={() => {
            setPendingFiles([]);
            setShowCancelConfirm(false);
            setStatus("idle");
            setError("");
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
