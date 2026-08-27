import { CATEGORIES } from "../../../shared/categories";

// A genuine multi-select filter — every category can be toggled
// independently (e.g. Portrait + Family on, Wedding + Product off) —
// deliberately different markup from the public Galleries page's
// single-select tabs (role="tablist"/role="tab"), which pick exactly one
// category at a time via a URL param. aria-pressed toggle buttons are the
// correct ARIA pattern for this kind of independent multi-select filter.
export default function CategoryFilterBar({ selected, onToggle }) {
  return (
    <div className="admin-filter-bar" role="group" aria-label="Filter by category">
      {CATEGORIES.map((category) => (
        <button
          key={category.key}
          type="button"
          className="admin-filter-chip"
          data-theme={category.key}
          aria-pressed={selected.has(category.key)}
          onClick={() => onToggle(category.key)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
