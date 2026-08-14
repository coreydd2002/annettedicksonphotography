import { checkPassword, signToken } from "../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!checkPassword(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    const { token, expiresAt } = signToken();
    return res.status(200).json({ token, expiresAt });
  } catch (error) {
    console.error("login: failed to sign token", error);
    return res.status(500).json({ error: "Server is not configured correctly" });
  }
}
