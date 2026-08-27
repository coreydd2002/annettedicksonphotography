import { useEffect, useRef, useState } from "react";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { IconEdit, IconDots, IconTrash } from "../../components/icons";
import { CATEGORIES, getCategory } from "../../../shared/categories";

// A condensed, expandable row in the admin's flat photo list. Renaming and
// changing category both autosave the instant they're committed (Enter or
// blur for the rename input, onChange for the category select) — there's
// no separate per-row Save button, matching how the trash icon deletes
// immediately once its confirm dialog is accepted.
export default function PhotoRow({
  photo,
  expanded,
  onToggleExpand,
  onRename,
  onChangeCategory,
  onDeleteRequest,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(null); // null | "rename" | "category"
  const [draftTitle, setDraftTitle] = useState(photo.title);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | error
  const [saveError, setSaveError] = useState("");
  const menuWrapRef = useRef(null);
  const cancelingRef = useRef(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const category = getCategory(photo.category);

  const openRename = () => {
    setDraftTitle(photo.title);
    setSaveStatus("idle");
    setSaveError("");
    setEditMode("rename");
    setMenuOpen(false);
  };

  const openCategoryEdit = () => {
    setSaveStatus("idle");
    setSaveError("");
    setEditMode("category");
    setMenuOpen(false);
  };

  const commitRename = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === photo.title) {
      setEditMode(null);
      return;
    }
    setSaveStatus("saving");
    setSaveError("");
    try {
      await onRename(photo.id, trimmed);
      setEditMode(null);
      setSaveStatus("idle");
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err.message || "Could not save — please try again.");
    }
  };

  const handleRenameKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.target.blur();
    } else if (event.key === "Escape") {
      cancelingRef.current = true;
      setEditMode(null);
    }
  };

  const handleRenameBlur = () => {
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return;
    }
    commitRename();
  };

  const handleCategoryChange = async (event) => {
    const nextCategory = event.target.value;
    setSaveStatus("saving");
    setSaveError("");
    try {
      await onChangeCategory(photo.id, nextCategory);
      setEditMode(null);
      setSaveStatus("idle");
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err.message || "Could not save — please try again.");
    }
  };

  const stopPropagation = (event) => event.stopPropagation();

  return (
    <li className="admin-photo-row" data-theme={photo.category}>
      <div
        className="admin-photo-row-header"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${photo.title}` : `Expand ${photo.title}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <span
          className={`admin-photo-row-chevron ${expanded ? "expanded" : ""}`}
          aria-hidden="true"
        />

        {editMode === "rename" ? (
          <input
            type="text"
            className="admin-photo-row-inline-edit"
            value={draftTitle}
            autoFocus
            onClick={stopPropagation}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            disabled={saveStatus === "saving"}
            aria-label="File name"
          />
        ) : (
          <span className="admin-photo-row-filename">{photo.title}</span>
        )}

        {editMode === "category" ? (
          <select
            className="admin-photo-row-category-select"
            value={photo.category}
            autoFocus
            onClick={stopPropagation}
            onChange={handleCategoryChange}
            disabled={saveStatus === "saving"}
            aria-label="Category"
          >
            {CATEGORIES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="admin-photo-row-category-badge">
            {category?.label || photo.category}
          </span>
        )}

        <div className="admin-photo-row-actions" onClick={stopPropagation}>
          <div className="admin-photo-row-menu-wrap" ref={menuWrapRef}>
            <button
              type="button"
              className="admin-photo-row-menu-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Edit ${photo.title}`}
            >
              <IconDots />
            </button>
            {menuOpen && (
              <div className="admin-photo-row-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="admin-photo-row-menu-item"
                  onClick={openRename}
                >
                  <IconEdit aria-hidden="true" />
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="admin-photo-row-menu-item"
                  onClick={openCategoryEdit}
                >
                  Change Category
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="admin-photo-row-delete"
            onClick={() => onDeleteRequest(photo)}
            aria-label={`Delete ${photo.title}`}
            title="Delete photo"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {saveStatus === "error" && (
        <p className="admin-photo-row-error" role="alert">
          {saveError}
        </p>
      )}

      {expanded && (
        <div className="admin-photo-row-expanded">
          <PlaceholderImage
            src={photo.src}
            alt={photo.title}
            variant={category?.variant}
            aspect={photo.aspect}
            className="admin-photo-row-full"
          />
        </div>
      )}
    </li>
  );
}
