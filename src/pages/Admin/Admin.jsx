import { useCallback, useEffect, useMemo, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import { IconEye, IconEyeOff } from "../../components/icons";
import ConfirmDialog from "./ConfirmDialog";
import CategoryFilterBar from "./CategoryFilterBar";
import PhotoRow from "./PhotoRow";
import AddPhotosPanel from "./AddPhotosPanel";
import { CATEGORY_KEYS } from "../../../shared/categories";
import { readAdminSession, writeAdminSession, clearAdminSession } from "../../adminSession";
import "./Admin.css";

function submitOnEnter(handler) {
  return (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handler(event);
    }
  };
}

export default function Admin() {
  const [session, setSession] = useState(() => readAdminSession());
  const isAuthenticated = Boolean(session);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState("idle");
  const [loginError, setLoginError] = useState("");

  const [items, setItems] = useState([]);
  const [listStatus, setListStatus] = useState("idle");

  const [selectedCategories, setSelectedCategories] = useState(() => new Set(CATEGORY_KEYS));
  const [expandedPhotoIds, setExpandedPhotoIds] = useState(() => new Set());
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [actionError, setActionError] = useState("");

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
        clearAdminSession();
        setSession(null);
      }
      return response;
    },
    [session],
  );

  const loadItems = useCallback(async () => {
    setListStatus("loading");
    try {
      const response = await authFetch("/api/admin/photos");
      if (!response.ok) throw new Error("Failed to load photo list");
      const data = await response.json();
      setItems(data.items || []);
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
      writeAdminSession(newSession);
      setSession(newSession);
      setPassword("");
      setLoginStatus("idle");
    } catch {
      setLoginStatus("error");
      setLoginError("Something went wrong — please try again.");
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setSession(null);
  };

  const toggleExpanded = (photoId) => {
    setExpandedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleCategory = (key) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredItems = useMemo(
    () => items.filter((photo) => selectedCategories.has(photo.category)),
    [items, selectedCategories],
  );

  const closeConfirm = () => setConfirmDialog(null);

  // Fires immediately on rename-commit or category-change — no separate
  // per-row save step. Throws on failure so PhotoRow can show an inline
  // error and let the user retry, instead of silently losing the edit.
  const patchPhoto = useCallback(
    async (id, patch) => {
      const response = await authFetch(`/api/admin/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save — please try again.");
      }
      setItems((prev) => prev.map((photo) => (photo.id === id ? { ...photo, ...data } : photo)));
    },
    [authFetch],
  );

  const requestDeletePhoto = (photo) => {
    setConfirmDialog({
      title: "Delete photo?",
      message: `Delete "${photo.title}"? This can't be undone.`,
      confirmLabel: "Delete Photo",
      pendingLabel: "Deleting…",
      onConfirm: async () => {
        setActionError("");
        setConfirmPending(true);
        try {
          const response = await authFetch(`/api/admin/photos/${photo.id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Could not delete the photo — please try again.");
          }
          setItems((prev) => prev.filter((item) => item.id !== photo.id));
          setExpandedPhotoIds((prev) => {
            const next = new Set(prev);
            next.delete(photo.id);
            return next;
          });
          closeConfirm();
        } catch (err) {
          setActionError(err.message || "Could not delete the photo — please try again.");
          closeConfirm();
        } finally {
          setConfirmPending(false);
        }
      },
    });
  };

  const addPhotos = useCallback((newPhotos) => {
    setItems((prev) => [...newPhotos, ...prev]);
  }, []);

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

  return (
    <section className="section admin-section admin-dashboard-section">
      <div className="container admin-dashboard-container">
        <div className="admin-header-row">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Gallery Manager</h1>
          </div>

          <div className="admin-header-actions">
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        {actionError && (
          <p className="form-banner form-banner-error" role="alert">
            {actionError}
          </p>
        )}

        <div className="admin-grid">
          <div className="admin-panel admin-list-panel">
            <div className="admin-list-header">
              <h2>Photos</h2>
              <CategoryFilterBar selected={selectedCategories} onToggle={toggleCategory} />
            </div>

            {listStatus === "error" && (
              <p className="form-banner form-banner-error" role="alert">
                Couldn't load the photo list —{" "}
                <button type="button" className="admin-retry" onClick={loadItems}>
                  retry
                </button>
                .
              </p>
            )}

            {listStatus === "loading" && items.length === 0 ? (
              <p className="admin-empty">Loading…</p>
            ) : items.length === 0 ? (
              <p className="admin-empty">No photos yet — add some using the panel on the right.</p>
            ) : filteredItems.length === 0 ? (
              <p className="admin-empty">No photos match the selected categories.</p>
            ) : (
              <ul className="admin-photo-list">
                {filteredItems.map((photo) => (
                  <PhotoRow
                    key={photo.id}
                    photo={photo}
                    expanded={expandedPhotoIds.has(photo.id)}
                    onToggleExpand={() => toggleExpanded(photo.id)}
                    onRename={(id, title) => patchPhoto(id, { title })}
                    onChangeCategory={(id, category) => patchPhoto(id, { category })}
                    onDeleteRequest={requestDeletePhoto}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="admin-workshop-panel">
            <AddPhotosPanel token={session?.token} onPhotosAdded={addPhotos} />
          </div>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog {...confirmDialog} pending={confirmPending} onCancel={closeConfirm} />
      )}
    </section>
  );
}
