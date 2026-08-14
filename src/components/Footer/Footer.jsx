import { Link } from "react-router-dom";
import { FloralDivider } from "../decorations";
import { NAV_LINKS, SITE } from "../../config";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span className="footer-brand">{SITE.brandName}</span>

        <ul className="footer-links">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to}>{link.label}</Link>
            </li>
          ))}
        </ul>

        <div className="footer-contact">
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <a href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`}>{SITE.phone}</a>
          <a href={SITE.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>

        <div className="divider-row">
          <FloralDivider />
        </div>

        <p className="footer-copyright">
          © {year} {SITE.brandName} {SITE.brandSuffix}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
