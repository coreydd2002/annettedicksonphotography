import { useEffect, useState } from "react";
import { IconClose } from "../../components/icons";
import { detectImageAspect, fileToDataUrl, MAX_IMAGE_BYTES } from "./utils";

// Single-photo add form, presented as a popup rather than the sidebar panel
// it started as. Always scoped to one already-known album, so — unlike the
// old top-level form — it has no album/category picker of its own.
export default function AddPhotoModal({ album, authFetch, onClose, onAdded }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [detectedAspect, setDetectedAspect] = useState("");
  const [fileError, setFileError] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0];
    setFileError("");
    setDetectedAspect("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);

    if (!selected) return;

    if (selected.size > MAX_IMAGE_BYTES) {
      setFileError(
        "Please use a photo under 3MB — consider resizing or reducing quality.",
      );
      return;
    }

    try {
      const aspect = await detectImageAspect(selected);
      setDetectedAspect(aspect);
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    } catch {
      setFileError("Could not read that image — please try a different file.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !file || !detectedAspect) {
      setStatus("error");
      setError("Please add a title and choose a photo before saving.");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const imageDataUrl = await fileToDataUrl(file);
      const response = await authFetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          aspect: detectedAspect,
          imageDataUrl,
          albumId: album.id,
          category: album.category,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong — please try again.");
        return;
      }

      onAdded(data.item);
    } catch {
      setStatus("error");
      setError("Something went wrong — please try again.");
    }
  };

  return (
    <div
      className="admin-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Add a photo to ${album.title}`}
    >
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal-panel">
        <button
          type="button"
          className="admin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose />
        </button>

        <h2>Add a Photo</h2>
        <p className="admin-modal-subtitle">Adding to &ldquo;{album.title}&rdquo;</p>

        {status === "error" && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}

        <form className="admin-upload-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="add-photo-title">Title</label>
            <input
              id="add-photo-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <label htmlFor="add-photo-file">Photo</label>
            <input
              id="add-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              required
            />
          </div>

          {fileError && <p className="admin-file-error">{fileError}</p>}

          {previewUrl && (
            <div className="admin-preview">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="admin-preview-image"
              />
              <span className="admin-preview-aspect">
                Detected aspect ratio: {detectedAspect}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === "submitting" || !file || Boolean(fileError)}
          >
            {status === "submitting" ? "Adding…" : "Add Photo"}
          </button>
        </form>
      </div>
    </div>
  );
}
