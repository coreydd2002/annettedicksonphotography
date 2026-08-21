// TODO: switch back to lorenandannette@gmail.com once live testing is done.
const TO_EMAIL = "coreydd2002@gmail.com";
const FROM_EMAIL = "Notice <Notice@annettedickson.photography>";

const FIELD_LABELS = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone Number",
  contactMethod: "Preferred Contact Method",
  sessionType: "Photoshoot Type",
  date: "Preferred Date",
  location: "Location",
  message: "Details",
};
const DETAIL_ORDER = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "contactMethod",
  "sessionType",
  "date",
  "location",
  "message",
];
const REQUIRED_FIELDS = ["firstName", "lastName", "contactMethod", "sessionType"];
// Whichever field the chosen contact method depends on is required; the other
// of email/phone is left optional, mirroring the form's own logic.
const CONTACT_METHOD_REQUIRES = {
  Text: "phone",
  Call: "phone",
  Email: "email",
};

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

  const requiredContactField = CONTACT_METHOD_REQUIRES[body.contactMethod];
  if (!requiredContactField) {
    return res.status(400).json({ error: "Preferred Contact Method is invalid" });
  }
  if (
    typeof body[requiredContactField] !== "string" ||
    !body[requiredContactField].trim()
  ) {
    return res.status(400).json({
      error: `${FIELD_LABELS[requiredContactField]} is required for ${body.contactMethod.toLowerCase()} contact`,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("contact: RESEND_API_KEY is not configured");
    return res.status(500).json({ error: "Server is not configured correctly" });
  }

  const name = `${body.firstName.trim()} ${body.lastName.trim()}`;
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
