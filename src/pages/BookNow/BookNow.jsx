import { useRef, useState } from "react";
import { CornerFlourish } from "../../components/decorations";
import "./BookNow.css";

const SESSION_TYPES = ["Portrait", "Wedding", "Product"];
const CONTACT_METHODS = ["Text", "Call", "Email"];
const CONTACT_VERBS = { Text: "text", Call: "call", Email: "email" };

export default function BookNow() {
  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [contactMethod, setContactMethod] = useState("");
  const [submitted, setSubmitted] = useState({ firstName: "", contactMethod: "" });

  const emailOptional = contactMethod === "Text" || contactMethod === "Call";
  const phoneOptional = contactMethod === "Email";

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

      if (response.ok) {
        setSubmitted({
          firstName: data.firstName,
          contactMethod: data.contactMethod,
        });
      }
      setStatus(response.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    formRef.current?.reset();
    setContactMethod("");
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
              <h1 className="book-now-success-heading">
                Thank you
                <br />
                {submitted.firstName}
              </h1>
              <p className="book-now-success-subtitle">Your request is in!</p>
              <p className="book-now-success-message">
                Annette has been notified of your request and will{" "}
                {CONTACT_VERBS[submitted.contactMethod] || "contact"} you as
                soon as she can.
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
                <div className="form-row-group">
                  <div className="form-row">
                    <label htmlFor="firstName">First Name *</label>
                    <input id="firstName" name="firstName" type="text" required />
                  </div>

                  <div className="form-row">
                    <label htmlFor="lastName">Last Name *</label>
                    <input id="lastName" name="lastName" type="text" required />
                  </div>
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label htmlFor="contactMethod">
                      Preferred Contact Method *
                    </label>
                    <select
                      id="contactMethod"
                      name="contactMethod"
                      required
                      value={contactMethod}
                      onChange={(event) => setContactMethod(event.target.value)}
                    >
                      <option value="" disabled>
                        Select one
                      </option>
                      {CONTACT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="sessionType">Photoshoot Type *</label>
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
                    <label htmlFor="email">
                      Email {emailOptional ? <em>(optional)</em> : "*"}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required={!emailOptional}
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="phone">
                      Phone Number {phoneOptional ? <em>(optional)</em> : "*"}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required={!phoneOptional}
                    />
                  </div>
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label htmlFor="date">
                      Preferred Date <em>(optional)</em>
                    </label>
                    <input id="date" name="date" type="date" />
                  </div>

                  <div className="form-row">
                    <label htmlFor="location">
                      Location <em>(optional)</em>
                    </label>
                    <input id="location" name="location" type="text" />
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="message">
                    Details <em>(optional)</em>
                  </label>
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
