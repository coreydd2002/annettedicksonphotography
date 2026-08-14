import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_LINKS, SITE } from "../../config";
import { WooshLine } from "../decorations";
import { IconMenu, IconClose } from "../icons";
import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navLinkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <header className="site-header">
      <div className="site-header-bar container">
        <NavLink
          to="/"
          className="brand"
          aria-label={`${SITE.brandName} ${SITE.brandSuffix} — home`}
        >
          <span className="brand-name">{SITE.brandName}</span>
          <span className="brand-suffix">{SITE.brandSuffix}</span>
          <WooshLine className="brand-flourish" />
        </NavLink>

        <nav className="site-nav" aria-label="Primary">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.to === "/"} className={navLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      <div className={`mobile-nav ${menuOpen ? "open" : ""}`}>
        <ul>
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === "/"} className={navLinkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
