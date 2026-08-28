const { Resend } = require("resend");

let client = null;

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new Resend(apiKey);
  }

  return client;
}

const SANDBOX_SENDER_DOMAIN = "resend.dev";

function extractDomain(address) {
  const match = String(address || "").match(/@([^>\s]+)/);
  return match ? match[1].toLowerCase().replace(/[>\s]+$/, "") : "";
}

/**
 * Report configuration that will fail at send time.
 *
 * Resend's shared sender (onboarding@resend.dev) only delivers to the address
 * that owns the Resend account, so a digest aimed anywhere else is rejected.
 * That rejection otherwise only surfaces in the log at 07:00, by which point
 * the missing email looks like the cron never ran.
 */
function checkDeliveryConfig() {
  const problems = [];

  const from = process.env.DIGEST_FROM_EMAIL || "";
  const to = process.env.DIGEST_TO_EMAIL || "";

  if (!process.env.RESEND_API_KEY) {
    problems.push("RESEND_API_KEY is not set - the digest cannot send.");
  }

  if (extractDomain(from).endsWith(SANDBOX_SENDER_DOMAIN)) {
    problems.push(
      `DIGEST_FROM_EMAIL uses Resend's sandbox sender (${from}). It can only ` +
        `deliver to the email that owns your Resend account, so sending to ` +
        `${to || "your recipient"} will be rejected. Verify a domain at ` +
        "resend.com/domains and set DIGEST_FROM_EMAIL to an address on it.",
    );
  }

  return problems;
}

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send one email through Resend.
 * Returns { ok, id?, error? } instead of throwing, so a failed digest never
 * takes down the cron job or the request that triggered it.
 */
async function sendEmail({ to, subject, html, text, from, replyTo }) {
  const resend = getClient();

  if (!resend) {
    return {
      ok: false,
      error:
        "RESEND_API_KEY is not set. Add it to Backend/.env to enable the daily digest.",
    };
  }

  const recipients = (Array.isArray(to) ? to : String(to || "").split(","))
    .map((address) => String(address).trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { ok: false, error: "No recipient configured (DIGEST_TO_EMAIL)." };
  }

  const sender =
    from ||
    process.env.DIGEST_FROM_EMAIL ||
    "TechPulse <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from: sender,
      to: recipients,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      // Resend reports validation and domain problems here, not as a throw.
      const message = error.message || JSON.stringify(error);
      console.error("[Mailer] Resend rejected the send:", message);
      return { ok: false, error: message };
    }

    return { ok: true, id: data?.id || null, recipients };
  } catch (err) {
    const message = err?.message || String(err);
    console.error("[Mailer] Send failed:", message);
    return { ok: false, error: message };
  }
}

module.exports = {
  sendEmail,
  isEmailConfigured,
  checkDeliveryConfig,
};
