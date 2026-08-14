import { Link } from "react-router-dom";
import Slideshow from "../../components/Slideshow/Slideshow";
import PlaceholderImage from "../../components/PlaceholderImage/PlaceholderImage";
import { FloralDivider } from "../../components/decorations";
import slides from "../../data/slides";
import "./Home.css";

const CATEGORIES = [
  { slug: "wedding", label: "Wedding", variant: 1 },
  { slug: "portrait", label: "Portrait", variant: 2 },
  { slug: "product", label: "Product", variant: 3 },
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
          <PlaceholderImage
            aspect="4 / 5"
            variant={4}
            label="Annette Dickson"
            className="about-portrait"
          />
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
            <Link to="/book-now" className="about-cta">
              Let's Capture Your Story →
            </Link>
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
                <PlaceholderImage aspect="4 / 5" variant={category.variant} />
                <span className="category-card-label">{category.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-row">
        <FloralDivider />
      </div>

      <section className="cta-band">
        <div className="container cta-band-inner">
          <h2>Ready to Book Your Session?</h2>
          <p>
            Let's find a date and talk through the details — I'd love to hear
            your story.
          </p>
          <Link to="/book-now" className="btn btn-primary">
            Book Now
          </Link>
        </div>
      </section>
    </>
  );
}
