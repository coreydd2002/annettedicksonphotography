import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PlaceholderImage from "../PlaceholderImage/PlaceholderImage";
import "./Slideshow.css";

export default function Slideshow({ slides, interval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const current = slides[currentIndex];

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % slides.length);
    }, interval);
  }, [interval, slides.length]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    startTimer();
  };

  return (
    <div className="slideshow">
      <div className="slideshow-layers" aria-hidden="true">
        {slides.map((slide, index) => (
          <PlaceholderImage
            key={slide.id}
            src={slide.src}
            alt={slide.heading}
            variant={slide.variant}
            aspect="auto"
            showIcon={false}
            className={`slideshow-layer ${
              index === currentIndex ? "active" : ""
            }`}
          />
        ))}
      </div>

      <div className="slideshow-scrim" aria-hidden="true" />

      <div className="slideshow-content container">
        <span className="eyebrow">{current.eyebrow}</span>
        <h1 className="slideshow-heading">{current.heading}</h1>
        <Link to="/book-now" className="btn btn-primary">
          Book a Session
        </Link>
      </div>

      <div
        className="slideshow-dots"
        role="tablist"
        aria-label="Slideshow navigation"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`Show slide ${index + 1}`}
            className={`slideshow-dot ${
              index === currentIndex ? "active" : ""
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
