import { Link, useLocation } from "react-router-dom";
import { FloralDivider } from "../decorations";
import { IconInstagram } from "../icons";
import { SITE } from "../../config";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  const { pathname } = useLocation();
  const isBookNowPage = pathname === "/book-now";

  // The admin dashboard manages its own fixed-height, independently-scrolling
  // layout (only the photo list scrolls) — a footer below it would break
  // that and doesn't belong on an internal tool anyway.
  if (pathname === "/admin") {
    return null;
  }

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        {!isBookNowPage && (
          <>
            <h2 className="footer-cta-heading">Ready to Book Your Session?</h2>

            <Link to="/book-now" className="btn footer-cta-btn">
              Book Now
            </Link>
          </>
        )}

        <div className="footer-brand-row">
          <span className="footer-brand">{SITE.brandName}</span>

          <a href={SITE.instagram} target="_blank" rel="noreferrer" className="footer-instagram">
            <IconInstagram className="footer-contact-icon" />
            @annettedickson.photo
          </a>
        </div>

        <div className="divider-row">
          <FloralDivider />
        </div>
      </div>

      <p className="footer-copyright">
        © {year} {SITE.brandName} {SITE.brandSuffix}. All rights reserved.
      </p>
    </footer>
  );
}
