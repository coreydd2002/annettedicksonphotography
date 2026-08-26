import { Link } from "react-router-dom";
import Slideshow from "../../components/Slideshow/Slideshow";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { FloralDivider } from "../../components/decorations";
import { IconInstagram } from "../../components/icons";
import slides from "../../data/slides";
import { SITE } from "../../config";
import { CATEGORIES } from "../../../shared/categories";
import "./Home.css";

// Home-page-local hero photo per category — kept here rather than on the
// shared registry since api/*.js has no use for a homepage image path.
// Engagement has no source photo yet, so its tile falls back to
// PlaceholderImage's themed gradient, same as every gallery seed item.
const HOME_IMAGES = {
  wedding: "/rings.webp",
  portrait: "/2022.05.26_sarah-wallace-360.webp",
  product: "/reset-your-nest-web-size-straightened-2-2.webp",
  family: "/ogden-family-9579.jpg",
};

export default function Home() {
  return (
    <>
      <Slideshow slides={slides} />

      <div className="divider-row">
        <FloralDivider />
      </div>

      <section className="section about-section">
        <div className="container about-grid">
          <div className="about-portrait-frame">
            <PlaceholderImage
              src="/me-60-2.webp"
              alt="Annette Dickson"
              aspect="4 / 5"
              variant={4}
              label="Annette Dickson"
              className="about-portrait"
            />
          </div>
          <div className="about-copy">
            <span className="eyebrow">Meet Annette</span>
            <h2>A Quiet Eye For Real Moments</h2>
            <p>
              I'm Annette — a photographer drawn to soft light, honest
              expressions, and the small in-between moments that make a day
              unforgettable. My approach is calm and unobtrusive, so what you
              come away with feels like <em>you</em>, not a performance.
            </p>
            <p>
              Based on location, available for travel, and always happy to
              talk through your vision before we begin.
            </p>
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noreferrer"
              className="about-cta"
            >
              <IconInstagram className="about-cta-icon" />
              Come and See @annettedickson.photo →
            </a>
          </div>
        </div>
      </section>

      <section className="section categories-section">
        <div className="container">
          <div className="categories-grid">
            {CATEGORIES.map((category) => {
              const src = HOME_IMAGES[category.key];
              return (
                <Link
                  key={category.key}
                  to={`/galleries?category=${category.key}`}
                  className="category-card"
                >
                  <div className="category-card-frame">
                    <div className="category-card-photo">
                      <PlaceholderImage
                        src={src}
                        alt={src ? category.label : ""}
                        aspect="4 / 5"
                        variant={category.variant}
                        className="category-card-image"
                        optimizeWidth={640}
                      />
                      <span className="category-card-label">
                        {category.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="divider-row">
        <FloralDivider />
      </div>
    </>
  );
}
