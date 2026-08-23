import { useCallback, useEffect, useRef, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import { IconDragHandle, IconEye, IconEyeOff } from "../../components/icons";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import {
  detectImageAspect,
  fileToDataUrl,
  MAX_IMAGE_BYTES,
  REDEPLOY_REDIRECT_KEY,
} from "./utils";
import "./Admin.css";

const SESSION_KEY = "adp_admin_token";

const CATEGORIES = [
  { key: "wedding", label: "Wedding" },
  { key: "portrait", label: "Portrait" },
  { key: "product", label: "Product" },
];

const FILTERS = [{ key: "all", label: "All" }, ...CATEGORIES];

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Splices a reordered view of one category's items back into their original
// slots in the full manifest order, leaving other categories' positions
// untouched. When activeFilter is "all", newVisibleOrder already IS the full
// order.
function applyReorder(items, activeFilter, newVisibleOrder) {
  if (activeFilter === "all") {
    return newVisibleOrder;
  }
  const visibleIndices = [];
  items.forEach((item, index) => {
    if (item.category === activeFilter) visibleIndices.push(index);
  });
  const next = [...items];
  visibleIndices.forEach((index, position) => {
    next[index] = newVisibleOrder[position];
  });
  return next;
}

function submitOnEnter(handler) {
  return (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handler(event);
    }
  };
}

export default function Admin() {
  const [session, setSession] = useState(() => readSession());
  const isAuthenticated = Boolean(session);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState("idle");
  const [loginError, setLoginError] = useState("");

  const [items, setItems] = useState([]);
  const [listStatus, setListStatus] = useState("idle");
  const [activeFilter, setActiveFilter] = useState("all");
  const savedItemsRef = useRef([]);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [publishStatus, setPublishStatus] = useState("idle"); // idle | saving | done | error
  const [publishError, setPublishError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("wedding");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [detectedAspect, setDetectedAspect] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const response = await fetch(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${session?.token}`,
        },
      });
      if (response.status === 401) {
        clearSession();
        setSession(null);
      }
      return response;
    },
    [session],
  );

  const loadItems = useCallback(async () => {
    setListStatus("loading");
    try {
      const response = await authFetch("/api/admin/list");
      if (!response.ok) throw new Error("Failed to load gallery list");
      const data = await response.json();
      const loaded = data.items || [];
      setItems(loaded);
      savedItemsRef.current = loaded;
      setListStatus("idle");
    } catch {
      setListStatus("error");
    }
  }, [authFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginStatus("submitting");
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setLoginStatus("error");
        setLoginError(data.error || "Invalid password");
        return;
      }

      const newSession = { token: data.token, expiresAt: data.expiresAt };
      writeSession(newSession);
      setSession(newSession);
      setPassword("");
      setLoginStatus("idle");
    } catch {
      setLoginStatus("error");
      setLoginError("Something went wrong — please try again.");
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0];
    setFileError("");
    setDetectedAspect("");
    setUploadStatus("idle");
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

  const resetUploadForm = () => {
    setTitle("");
    setCategory("wedding");
    setFile(null);
    setDetectedAspect("");
    setFileError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Commits the image file right away (so it exists, small request, one at a
  // time) and adds it to the local staged list. The public site doesn't
  // change until "Save and Redeploy" writes the manifest.
  const handleUpload = async (event) => {
    event.preventDefault();

    if (!title.trim() || !file || !detectedAspect) {
      setUploadStatus("error");
      setUploadError("Please add a title and choose a photo before saving.");
      return;
    }

    setUploadStatus("submitting");
    setUploadError("");

    try {
      const imageDataUrl = await fileToDataUrl(file);
      const response = await authFetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          aspect: detectedAspect,
          imageDataUrl,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setUploadStatus("error");
        setUploadError(data.error || "Something went wrong — please try again.");
        return;
      }

      setItems((prev) => [...prev, data.item]);
      setUploadStatus("success");
      resetUploadForm();
    } catch {
      setUploadStatus("error");
      setUploadError("Something went wrong — please try again.");
    }
  };

  // Purely local — nothing is deleted on GitHub until "Save and Redeploy".
  const handleDelete = (item) => {
    if (
      !window.confirm(
        `Remove "${item.title}" from the gallery? This won't take effect until you Save and Redeploy.`,
      )
    ) {
      return;
    }
    setItems((prev) => prev.filter((existing) => existing.id !== item.id));
  };

  const visibleItems =
    activeFilter === "all"
      ? items
      : items.filter((item) => item.category === activeFilter);

  const hasPendingChanges =
    items.map((item) => String(item.id)).join("|") !==
    savedItemsRef.current.map((item) => String(item.id)).join("|");

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

    const fromIndex = visibleItems.findIndex((item) => item.id === sourceId);
    const toIndex = visibleItems.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reorderedVisible = [...visibleItems];
    const [moved] = reorderedVisible.splice(fromIndex, 1);
    reorderedVisible.splice(toIndex, 0, moved);

    setItems((prevItems) => applyReorder(prevItems, activeFilter, reorderedVisible));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDiscardAll = () => {
    setItems(savedItemsRef.current);
    setPublishStatus("idle");
    setPublishError("");
  };

  const handlePublish = async () => {
    setPublishStatus("saving");
    setPublishError("");

    try {
      const response = await authFetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPublishStatus("error");
        setPublishError(data.error || "Could not save changes — please try again.");
        return;
      }

      sessionStorage.setItem(REDEPLOY_REDIRECT_KEY, "1");
      setPublishStatus("done");
    } catch {
      setPublishStatus("error");
      setPublishError("Could not save changes — please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="section admin-section">
        <div className="container admin-login-container">
          <div className="admin-card">
            <CornerFlourish corner="top-left" className="card-flourish card-flourish-tl" />
            <CornerFlourish corner="bottom-right" className="card-flourish card-flourish-br" />

            <span className="eyebrow">Admin</span>
            <h1>Gallery Manager</h1>
            <p className="admin-login-intro">
              Sign in to add or remove gallery photos.
            </p>

            {loginStatus === "error" && (
              <p className="form-banner form-banner-error" role="alert">
                {loginError}
              </p>
            )}

            <form className="admin-login-form" onSubmit={handleLogin}>
              <div className="form-row">
                <label htmlFor="admin-password">Password</label>
                <div className="password-field">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={submitOnEnter(handleLogin)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loginStatus === "submitting"}
              >
                {loginStatus === "submitting" ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  if (publishStatus === "done") {
    return (
      <section className="section admin-section admin-redeploy-section">
        <div className="container admin-redeploy-container">
          <span className="eyebrow">Saved</span>
          <h1>Redeploying…</h1>
          <p>
            Your changes are saved and the site is rebuilding. This usually
            takes a minute or two — wait a bit, then refresh this page.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section admin-section admin-dashboard-section">
      <div className="container admin-dashboard-container">
        <div className="admin-header-row">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Gallery Manager</h1>
          </div>
          <button type="button" className="btn btn-outline" onClick={handleLogout}>
            Sign Out
          </button>
        </div>

        <div className="admin-grid">
          <div className="admin-sidebar">
            <div className="admin-panel admin-upload-panel">
              <h2>Add a Photo</h2>

              {uploadStatus === "success" && (
                <p className="form-banner form-banner-success" role="status">
                  Added — it's in the list below. Click "Save and Redeploy"
                  when you're done making changes.
                </p>
              )}
              {uploadStatus === "error" && (
                <p className="form-banner form-banner-error" role="alert">
                  {uploadError}
                </p>
              )}

              <form className="admin-upload-form" onSubmit={handleUpload}>
                <div className="form-row">
                  <label htmlFor="admin-title">Title</label>
                  <input
                    id="admin-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={submitOnEnter(handleUpload)}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="admin-category">Category</label>
                  <select
                    id="admin-category"
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
                  <label htmlFor="admin-file">Photo</label>
                  <input
                    id="admin-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    ref={fileInputRef}
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
                  disabled={
                    uploadStatus === "submitting" || !file || Boolean(fileError)
                  }
                >
                  {uploadStatus === "submitting" ? "Adding…" : "Add Photo"}
                </button>
              </form>
            </div>

            <div className="admin-publish-panel">
              {publishStatus === "error" && (
                <p className="form-banner form-banner-error" role="alert">
                  {publishError}
                </p>
              )}
              {hasPendingChanges && (
                <button
                  type="button"
                  className="admin-discard-link"
                  onClick={handleDiscardAll}
                  disabled={publishStatus === "saving"}
                >
                  Discard changes
                </button>
              )}
              <button
                type="button"
                className={`btn btn-primary admin-publish-btn ${
                  hasPendingChanges ? "" : "is-faded"
                }`}
                onClick={handlePublish}
                disabled={!hasPendingChanges || publishStatus === "saving"}
              >
                {publishStatus === "saving" ? "Saving & Redeploying…" : "Save and Redeploy"}
              </button>
            </div>
          </div>

          <div className="admin-panel admin-list-panel">
            <div className="admin-list-header">
              <h2>Current Photos</h2>
              <div
                className="filter-tabs admin-filter-tabs"
                role="tablist"
                aria-label="Filter by category"
              >
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === filter.key}
                    className={`filter-tab ${
                      activeFilter === filter.key ? "active" : ""
                    }`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {listStatus === "error" && (
              <p className="form-banner form-banner-error" role="alert">
                Couldn't load the gallery list —{" "}
                <button type="button" className="admin-retry" onClick={loadItems}>
                  retry
                </button>
                .
              </p>
            )}

            {listStatus === "loading" && items.length === 0 ? (
              <p className="admin-empty">Loading…</p>
            ) : visibleItems.length === 0 ? (
              <p className="admin-empty">No photos in this category yet.</p>
            ) : (
              <>
                <p className="admin-list-hint">
                  Drag a photo to reorder it, then Save and Redeploy.
                </p>
                <ul className="admin-photo-list">
                  {visibleItems.map((item) => (
                    <li
                      key={item.id}
                      className={`admin-photo-card ${
                        draggedId === item.id ? "dragging" : ""
                      } ${dragOverId === item.id ? "drag-over" : ""}`}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item.id)}
                      onDragOver={(event) => handleDragOver(event, item.id)}
                      onDragLeave={() => handleDragLeave(item.id)}
                      onDrop={(event) => handleDrop(event, item.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <span className="admin-drag-handle" aria-label="Drag to reorder">
                        <IconDragHandle />
                      </span>
                      <PlaceholderImage
                        src={item.src}
                        alt={item.title}
                        variant={item.variant}
                        aspect={item.aspect}
                        draggable={false}
                        className="admin-photo-thumb"
                      />
                      <div className="admin-photo-meta">
                        <span className="admin-photo-title">{item.title}</span>
                        <span className="admin-photo-category">
                          {item.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline admin-delete-btn"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
