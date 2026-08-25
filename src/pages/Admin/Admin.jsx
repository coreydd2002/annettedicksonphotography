import { useCallback, useEffect, useRef, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import { IconEdit, IconEye, IconEyeOff } from "../../components/icons";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import ConfirmDialog from "./ConfirmDialog";
import AlbumDrawer from "./AlbumDrawer";
import {
  detectImageAspect,
  fileToDataUrl,
  humanizeFilename,
  MAX_IMAGE_BYTES,
  REDEPLOY_REDIRECT_KEY,
} from "./utils";
import { CATEGORIES, getCategory } from "../../../shared/categories";
import "./Admin.css";

const SESSION_KEY = "adp_admin_token";

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

// Splices a reordered view of one album's photos back into their original
// slots in the full manifest order, leaving other albums' positions
// untouched.
function reorderAlbumPhotos(items, albumId, newOrder) {
  const albumIndices = [];
  items.forEach((item, index) => {
    if (item.albumId === albumId) albumIndices.push(index);
  });
  const next = [...items];
  albumIndices.forEach((index, position) => {
    next[index] = newOrder[position];
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

let pendingFileCounter = 0;

export default function Admin() {
  const [session, setSession] = useState(() => readSession());
  const isAuthenticated = Boolean(session);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState("idle");
  const [loginError, setLoginError] = useState("");

  const [items, setItems] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [listStatus, setListStatus] = useState("idle");
  const savedItemsRef = useRef([]);
  const savedAlbumsRef = useRef([]);

  const [expandedAlbumIds, setExpandedAlbumIds] = useState(() => new Set());
  const [editingAlbumId, setEditingAlbumId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [publishStatus, setPublishStatus] = useState("idle"); // idle | saving | done | error
  const [publishError, setPublishError] = useState("");

  // "Add an Album" block
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumCategory, setNewAlbumCategory] = useState(CATEGORIES[0].key);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [addAlbumStatus, setAddAlbumStatus] = useState("idle");
  const [addAlbumError, setAddAlbumError] = useState("");

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
      const loadedItems = data.items || [];
      const loadedAlbums = data.albums || [];
      setItems(loadedItems);
      savedItemsRef.current = loadedItems;
      setAlbums(loadedAlbums);
      savedAlbumsRef.current = loadedAlbums;
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

  const resetAddAlbumForm = () => {
    setNewAlbumTitle("");
    setNewAlbumCategory(CATEGORIES[0].key);
    setPendingFiles([]);
  };

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

  const canAddAlbum =
    newAlbumTitle.trim() &&
    pendingFiles.some((entry) => !entry.error) &&
    addAlbumStatus !== "submitting";

  // Creates the album (via the first upload) and uploads every valid
  // pending photo to it, one at a time — each upload is its own small
  // request, same as the single-photo flow. Nothing is live until "Save
  // and Redeploy"; this just stages the new album and its photos locally.
  const handleAddAlbum = async () => {
    if (!canAddAlbum) return;

    const validEntries = pendingFiles.filter((entry) => !entry.error);
    setAddAlbumStatus("submitting");
    setAddAlbumError("");

    let createdAlbum = null;
    const succeededIds = new Set();
    const newItems = [];
    let uploadError = "";

    for (const entry of validEntries) {
      try {
        const imageDataUrl = await fileToDataUrl(entry.file);
        const body = createdAlbum
          ? {
              title: humanizeFilename(entry.name),
              aspect: entry.aspect,
              imageDataUrl,
              albumId: createdAlbum.id,
              category: createdAlbum.category,
            }
          : {
              title: humanizeFilename(entry.name),
              aspect: entry.aspect,
              imageDataUrl,
              newAlbum: {
                title: newAlbumTitle.trim(),
                category: newAlbumCategory,
              },
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

        if (data.album) createdAlbum = data.album;
        newItems.push(data.item);
        succeededIds.add(entry.id);
      } catch {
        uploadError = "Something went wrong uploading one of the photos.";
        break;
      }
    }

    if (newItems.length) setItems((prev) => [...prev, ...newItems]);
    if (createdAlbum) setAlbums((prev) => [...prev, createdAlbum]);
    setPendingFiles((prev) => prev.filter((entry) => !succeededIds.has(entry.id)));

    if (uploadError) {
      setAddAlbumStatus("error");
      setAddAlbumError(uploadError);
    } else {
      setAddAlbumStatus("idle");
      resetAddAlbumForm();
    }
  };

  const toggleExpanded = (albumId) => {
    setExpandedAlbumIds((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  };

  const requestConfirm = (options) => setConfirmDialog(options);
  const closeConfirm = () => setConfirmDialog(null);

  const requestDeleteAlbum = (album) => {
    const photoCount = items.filter((item) => item.albumId === album.id).length;
    requestConfirm({
      title: "Delete album?",
      message: `Delete "${album.title}" and ${photoCount} ${
        photoCount === 1 ? "photo" : "photos"
      } in it? This won't take effect until you Save and Redeploy.`,
      confirmLabel: "Delete Album",
      onConfirm: () => {
        setAlbums((prev) => prev.filter((a) => a.id !== album.id));
        setItems((prev) => prev.filter((item) => item.albumId !== album.id));
        setEditingAlbumId(null);
        closeConfirm();
      },
    });
  };

  const requestDeletePhoto = (photo) => {
    requestConfirm({
      title: "Delete photo?",
      message: `Remove "${photo.title}" from the gallery? This won't take effect until you Save and Redeploy.`,
      confirmLabel: "Delete Photo",
      onConfirm: () => {
        setItems((prev) => prev.filter((item) => item.id !== photo.id));
        closeConfirm();
      },
    });
  };

  const hasPendingChanges =
    JSON.stringify(items) !== JSON.stringify(savedItemsRef.current) ||
    JSON.stringify(albums) !== JSON.stringify(savedAlbumsRef.current);

  const handleDiscardAll = () => {
    setItems(savedItemsRef.current);
    setAlbums(savedAlbumsRef.current);
    setEditingAlbumId(null);
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
        body: JSON.stringify({ items, albums }),
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

  const editingAlbum = albums.find((album) => album.id === editingAlbumId) || null;

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
              <h2>Add an Album</h2>

              {addAlbumStatus === "error" && (
                <p className="form-banner form-banner-error" role="alert">
                  {addAlbumError}
                </p>
              )}

              <div className="admin-upload-form">
                <div className="form-row">
                  <label htmlFor="admin-new-album-title">Album Name</label>
                  <input
                    id="admin-new-album-title"
                    type="text"
                    value={newAlbumTitle}
                    onChange={(event) => setNewAlbumTitle(event.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="admin-new-album-category">Photoshoot Type</label>
                  <select
                    id="admin-new-album-category"
                    value={newAlbumCategory}
                    onChange={(event) => setNewAlbumCategory(event.target.value)}
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

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddAlbum}
                  disabled={!canAddAlbum}
                >
                  {addAlbumStatus === "submitting" ? "Adding…" : "Add Album"}
                </button>
              </div>
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
              <h2>Albums</h2>
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

            {listStatus === "loading" && albums.length === 0 ? (
              <p className="admin-empty">Loading…</p>
            ) : albums.length === 0 ? (
              <p className="admin-empty">No albums yet — add one to get started.</p>
            ) : (
              <ul className="admin-album-list">
                {albums.map((album) => {
                  const photos = items.filter((item) => item.albumId === album.id);
                  const expanded = expandedAlbumIds.has(album.id);
                  const category = getCategory(album.category);
                  return (
                    <li key={album.id} className="admin-album-card">
                      <div className="admin-album-row">
                        <button
                          type="button"
                          className="admin-album-toggle"
                          onClick={() => toggleExpanded(album.id)}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Collapse album" : "Expand album"}
                        >
                          <span
                            className={`admin-album-chevron ${expanded ? "expanded" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                        <PlaceholderImage
                          src={photos[0]?.src}
                          alt={album.title}
                          variant={category?.variant}
                          aspect="1 / 1"
                          showIcon={false}
                          className="admin-album-thumb"
                        />
                        <div className="admin-album-meta">
                          <span className="admin-album-title">{album.title}</span>
                          <span className="admin-album-category">
                            {category?.label || album.category} · {photos.length}{" "}
                            {photos.length === 1 ? "photo" : "photos"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="admin-album-edit"
                          onClick={() => setEditingAlbumId(album.id)}
                          aria-label={`Edit ${album.title}`}
                        >
                          <IconEdit />
                        </button>
                      </div>

                      {expanded && (
                        <ul className="admin-album-photos">
                          {photos.length === 0 ? (
                            <li className="admin-empty">No photos yet.</li>
                          ) : (
                            photos.map((photo) => (
                              <li key={photo.id} className="admin-album-photo-row">
                                <PlaceholderImage
                                  src={photo.src}
                                  alt={photo.title}
                                  variant={photo.variant}
                                  aspect="1 / 1"
                                  showIcon={false}
                                  className="admin-album-photo-thumb"
                                />
                                <span className="admin-album-photo-title">{photo.title}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {editingAlbum && (
        <AlbumDrawer
          album={editingAlbum}
          photos={items.filter((item) => item.albumId === editingAlbum.id)}
          authFetch={authFetch}
          onClose={() => setEditingAlbumId(null)}
          onRenameAlbum={(newTitle) =>
            setAlbums((prev) =>
              prev.map((a) => (a.id === editingAlbum.id ? { ...a, title: newTitle } : a)),
            )
          }
          onDeleteAlbumRequest={() => requestDeleteAlbum(editingAlbum)}
          onRenamePhoto={(photoId, newTitle) =>
            setItems((prev) =>
              prev.map((item) => (item.id === photoId ? { ...item, title: newTitle } : item)),
            )
          }
          onDeletePhotoRequest={requestDeletePhoto}
          onReorderPhotos={(newOrder) =>
            setItems((prev) => reorderAlbumPhotos(prev, editingAlbum.id, newOrder))
          }
          onPhotoAdded={(item) => setItems((prev) => [...prev, item])}
        />
      )}

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} />}
    </section>
  );
}
