import { useCallback, useEffect, useRef, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import { IconEdit, IconEye, IconEyeOff } from "../../components/icons";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import Lightbox from "../../components/Lightbox/Lightbox";
import ConfirmDialog from "./ConfirmDialog";
import AlbumDrawer from "./AlbumDrawer";
import AddAlbumPanel from "./AddAlbumPanel";
import { REDEPLOY_REDIRECT_KEY } from "./utils";
import { getCategory } from "../../../shared/categories";
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

// Replaces one album's slice of the flat items array with its (possibly
// reordered/renamed/added-to/deleted-from) draft version from the workshop.
// Cross-album absolute position doesn't matter — every consumer filters by
// albumId, which preserves each album's own relative order regardless of
// where its items sit in the full array — so it's safe to just drop this
// album's old entries and append the new ones.
function applyAlbumPhotos(items, albumId, newAlbumPhotos) {
  return [...items.filter((item) => item.albumId !== albumId), ...newAlbumPhotos];
}

function isSameWorkshop(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  return a.type === "edit" ? a.albumId === b.albumId : true;
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
  const [albums, setAlbums] = useState([]);
  const [listStatus, setListStatus] = useState("idle");
  const savedItemsRef = useRef([]);
  const savedAlbumsRef = useRef([]);

  const [expandedAlbumIds, setExpandedAlbumIds] = useState(() => new Set());

  // The right-hand "workshop" panel is either empty, adding a new album, or
  // editing an existing one — never more than one at a time.
  const [workshop, setWorkshop] = useState(null); // null | { type: "add" } | { type: "edit", albumId }
  const [workshopIsDirty, setWorkshopIsDirty] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [lightbox, setLightbox] = useState(null); // null | { photos, index }

  const [publishStatus, setPublishStatus] = useState("idle"); // idle | saving | done | error
  const [publishError, setPublishError] = useState("");

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

  const closeWorkshop = () => {
    setWorkshop(null);
    setWorkshopIsDirty(false);
  };

  // Changing what the workshop panel shows (a different album, "add new",
  // or closing it) discards whatever draft is currently in there — so if
  // it's dirty, confirm first. Re-requesting the same thing that's already
  // open needs no confirmation.
  const requestSetWorkshop = (newWorkshop) => {
    if (!isSameWorkshop(workshop, newWorkshop) && workshopIsDirty) {
      const label =
        workshop?.type === "edit"
          ? `"${albums.find((a) => a.id === workshop.albumId)?.title || "this album"}"`
          : "the new album you were adding";
      requestConfirm({
        title: "Discard unsaved changes?",
        message: `You have unsaved changes to ${label}. Continuing will discard them.`,
        confirmLabel: "Discard & Continue",
        onConfirm: () => {
          setWorkshop(newWorkshop);
          setWorkshopIsDirty(false);
          closeConfirm();
        },
      });
    } else {
      setWorkshop(newWorkshop);
      setWorkshopIsDirty(false);
    }
  };

  const handleAlbumCreated = ({ album, items: newItems }) => {
    if (album) setAlbums((prev) => [...prev, album]);
    if (newItems?.length) setItems((prev) => [...prev, ...newItems]);
  };

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
        closeWorkshop();
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
    closeWorkshop();
    setPublishStatus("idle");
    setPublishError("");
  };

  const requestDiscardAll = () => {
    requestConfirm({
      title: "Discard all changes?",
      message:
        "This will undo every add, edit, and delete you've made since the last publish.",
      confirmLabel: "Discard Changes",
      onConfirm: () => {
        handleDiscardAll();
        closeConfirm();
      },
    });
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

  const editingAlbum =
    workshop?.type === "edit"
      ? albums.find((album) => album.id === workshop.albumId) || null
      : null;

  return (
    <section className="section admin-section admin-dashboard-section">
      <div className="container admin-dashboard-container">
        <div className="admin-header-row">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Gallery Manager</h1>
          </div>

          <div className="admin-header-actions">
            {hasPendingChanges && (
              <button
                type="button"
                className="admin-discard-link"
                onClick={requestDiscardAll}
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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => requestSetWorkshop({ type: "add" })}
            >
              Add New Album
            </button>
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        {publishStatus === "error" && (
          <p className="form-banner form-banner-error" role="alert">
            {publishError}
          </p>
        )}

        <div className="admin-grid">
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
                          onClick={() => requestSetWorkshop({ type: "edit", albumId: album.id })}
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
                            photos.map((photo, index) => (
                              <li key={photo.id} className="admin-album-photo-row">
                                <button
                                  type="button"
                                  className="admin-thumb-btn"
                                  onClick={() => setLightbox({ photos, index })}
                                  aria-label={`View ${photo.title}`}
                                >
                                  <PlaceholderImage
                                    src={photo.src}
                                    alt={photo.title}
                                    variant={photo.variant}
                                    aspect="1 / 1"
                                    showIcon={false}
                                    className="admin-album-photo-thumb"
                                  />
                                </button>
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

          <div
            className="admin-workshop-panel"
            data-theme={editingAlbum ? editingAlbum.category : undefined}
          >
            {workshop?.type === "add" && (
              <AddAlbumPanel
                authFetch={authFetch}
                onClose={closeWorkshop}
                onDirtyChange={setWorkshopIsDirty}
                onAlbumCreated={handleAlbumCreated}
              />
            )}

            {workshop?.type === "edit" && editingAlbum && (
              <AlbumDrawer
                key={editingAlbum.id}
                album={editingAlbum}
                photos={items.filter((item) => item.albumId === editingAlbum.id)}
                authFetch={authFetch}
                onClose={closeWorkshop}
                onDirtyChange={setWorkshopIsDirty}
                onRenameAlbum={(newTitle) =>
                  setAlbums((prev) =>
                    prev.map((a) => (a.id === editingAlbum.id ? { ...a, title: newTitle } : a)),
                  )
                }
                onDeleteAlbumRequest={() => requestDeleteAlbum(editingAlbum)}
                onSavePhotos={(newAlbumPhotos) =>
                  setItems((prev) => applyAlbumPhotos(prev, editingAlbum.id, newAlbumPhotos))
                }
              />
            )}

            {!workshop && (
              <div className="admin-workshop-empty">
                <span className="eyebrow">Workshop</span>
                <p>
                  Select an album to edit, or click &ldquo;Add New Album&rdquo; above
                  to create one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDialog && <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} />}

      {lightbox && (
        <Lightbox
          items={lightbox.photos}
          currentIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() =>
            setLightbox((prev) => ({
              ...prev,
              index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
            }))
          }
          onNext={() =>
            setLightbox((prev) => ({
              ...prev,
              index: (prev.index + 1) % prev.photos.length,
            }))
          }
        />
      )}
    </section>
  );
}
