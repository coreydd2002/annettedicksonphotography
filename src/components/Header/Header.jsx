import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_LINKS, ADMIN_NAV_LINK, SITE } from "../../config";
import { readAdminSession, onAdminSessionChange } from "../../adminSession";
import { WooshLine } from "../decorations";
import { IconMenu, IconClose, IconInstagram } from "../icons";
import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => Boolean(readAdminSession()));
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

  // Reacts immediately to sign-in/out (same tab, via a custom event — see
  // adminSession.js) rather than only picking it up on the next navigation.
  useEffect(() => {
    const recheck = () => setIsAdmin(Boolean(readAdminSession()));
    recheck();
    return onAdminSessionChange(recheck);
  }, [location.pathname]);

  const navLinks = isAdmin ? [...NAV_LINKS, ADMIN_NAV_LINK] : NAV_LINKS;

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

        <div className="header-right">
          <nav className="site-nav" aria-label="Primary">
            <ul>
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.to === "/"} className={navLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={SITE.instagram}
            target="_blank"
            rel="noreferrer"
            className="header-instagram-btn"
            aria-label="Instagram"
          >
            <IconInstagram className="header-instagram-icon" />
          </a>

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
      </div>

      <div className={`mobile-nav ${menuOpen ? "open" : ""}`}>
        <ul>
          {navLinks.map((link) => (
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
