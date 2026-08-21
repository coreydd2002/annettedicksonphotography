import { useRef, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import "./BookNow.css";

const SESSION_TYPES = ["Wedding", "Portrait", "Product", "Other"];

export default function BookNow() {
  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = formRef.current;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setStatus("submitting");

    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      setStatus(response.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    formRef.current?.reset();
    setStatus("idle");
  };

  return (
    <section className="section book-now-section">
      <div className="container book-now-container">
        <div className="book-now-card">
          <CornerFlourish
            corner="top-left"
            className="card-flourish card-flourish-tl"
          />
          <CornerFlourish
            corner="bottom-right"
            className="card-flourish card-flourish-br"
          />

          {status === "success" ? (
            <div className="book-now-success">
              <span className="eyebrow">Thank You!</span>
              <h1>Your Request Is In</h1>
              <p>
                We'll be in touch within 1-2 business days to talk through
                dates and details.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <>
              <span className="eyebrow">Book Now</span>
              <h1>Let's Plan Your Session</h1>
              <p className="book-now-intro">
                Tell me a little about what you're picturing, and I'll follow
                up to lock in a date.
              </p>

              {status === "error" && (
                <p className="form-banner form-banner-error" role="alert">
                  Something went wrong sending your request — please try
                  again.
                </p>
              )}

              <form
                ref={formRef}
                className="book-now-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="form-row">
                  <label htmlFor="name">Full Name *</label>
                  <input id="name" name="name" type="text" required />
                </div>

                <div className="form-row">
                  <label htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required />
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" />
                  </div>

                  <div className="form-row">
                    <label htmlFor="sessionType">Session Type *</label>
                    <select
                      id="sessionType"
                      name="sessionType"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select one
                      </option>
                      {SESSION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label htmlFor="date">Preferred Date *</label>
                    <input id="date" name="date" type="date" required />
                  </div>

                  <div className="form-row">
                    <label htmlFor="location">Location</label>
                    <input id="location" name="location" type="text" />
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="message">Message / Details</label>
                  <textarea id="message" name="message" rows="4" />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Send Request"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
