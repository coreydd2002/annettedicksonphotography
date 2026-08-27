import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_LINKS, ADMIN_NAV_LINK, SITE } from "../../config";
import { readAdminSession, onAdminSessionChange } from "../../adminSession";
import { WooshLine } from "../decorations";
import { IconInstagram, IconHome, IconImage, IconCalendar, IconEdit } from "../icons";
import "./Header.css";

const MOBILE_NAV_ICONS = {
  "/": IconHome,
  "/galleries": IconImage,
  "/book-now": IconCalendar,
  "/admin": IconEdit,
};

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(() => Boolean(readAdminSession()));
  const location = useLocation();

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

          <nav className="mobile-icon-nav" aria-label="Primary">
            <ul>
              {navLinks.map((link) => {
                const Icon = MOBILE_NAV_ICONS[link.to];
                return (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.to === "/"}
                      className={navLinkClass}
                      aria-label={link.label}
                    >
                      <Icon className="mobile-nav-icon" />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
