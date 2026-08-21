const TO_EMAIL = "lorenandannette@gmail.com";
const FROM_EMAIL = "Notice <Notice@annettedickson.photography>";

const FIELD_LABELS = {
  name: "Full Name",
  email: "Email",
  phone: "Phone",
  sessionType: "Session Type",
  date: "Preferred Date",
  location: "Location",
  message: "Message / Details",
};
const DETAIL_ORDER = [
  "name",
  "email",
  "phone",
  "sessionType",
  "date",
  "location",
  "message",
];
const REQUIRED_FIELDS = ["name", "email", "sessionType", "date"];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};

  for (const field of REQUIRED_FIELDS) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return res.status(400).json({ error: `${FIELD_LABELS[field]} is required` });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("contact: RESEND_API_KEY is not configured");
    return res.status(500).json({ error: "Server is not configured correctly" });
  }

  const name = body.name.trim();
  const details = DETAIL_ORDER.map((field) => ({
    label: FIELD_LABELS[field],
    value: typeof body[field] === "string" ? body[field].trim() : "",
  })).filter((detail) => detail.value);

  const text = [
    `${name} wants to talk!`,
    "",
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
  ].join("\n");

  const html = `
    <p>${escapeHtml(name)} wants to talk!</p>
    <table cellpadding="0" cellspacing="0">
      ${details
        .map(
          (detail) => `
        <tr>
          <td style="padding:4px 12px 4px 0;font-weight:600;">${escapeHtml(detail.label)}</td>
          <td style="padding:4px 0;">${escapeHtml(detail.value)}</td>
        </tr>`,
        )
        .join("")}
    </table>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: "New Client",
        text,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("contact: Resend request failed", response.status, errorText);
      return res.status(502).json({ error: "Failed to send your request" });
    }
  } catch (error) {
    console.error("contact: failed to reach Resend", error);
    return res.status(502).json({ error: "Failed to send your request" });
  }

  return res.status(200).json({ ok: true });
}
