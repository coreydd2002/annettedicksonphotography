import { Link } from "react-router-dom";
import Slideshow from "../../components/Slideshow/Slideshow";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { FloralDivider } from "../../components/decorations";
import { IconInstagram } from "../../components/icons";
import slides from "../../data/slides";
import { SITE } from "../../config";
import "./Home.css";

const CATEGORIES = [
  { slug: "wedding", label: "Wedding", variant: 1, src: "/rings.webp" },
  {
    slug: "portrait",
    label: "Portrait",
    variant: 2,
    src: "/2022.05.26_sarah-wallace-360.webp",
  },
  {
    slug: "product",
    label: "Product",
    variant: 3,
    src: "/reset-your-nest-web-size-straightened-2-2.webp",
  },
];

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
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to={`/galleries?category=${category.slug}`}
                className="category-card"
              >
                <div className="category-card-frame">
                  <div className="category-card-photo">
                    <PlaceholderImage
                      src={category.src}
                      alt={category.src ? category.label : ""}
                      aspect="4 / 5"
                      variant={category.variant}
                      className="category-card-image"
                    />
                    <span className="category-card-label">
                      {category.label}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-row">
        <FloralDivider />
      </div>
    </>
  );
}
