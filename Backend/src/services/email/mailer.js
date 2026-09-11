const { brevoRequest } = require("../brevoClient");

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

function getApiKey() {
  return process.env.BREVO_API_KEY || "";
}

function isEmailConfigured() {
  return Boolean(getApiKey());
}

/** Brevo wants { name?, email }. Accepts "Name <email>" or a bare address. */
function parseAddress(address) {
  const match = String(address || "").match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { ...(name ? { name } : {}), email: match[2].trim() };
  }
  return { email: String(address || "").trim() };
}

function parseAddressList(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map((address) => String(address).trim())
    .filter(Boolean)
    .map(parseAddress);
}

/**
 * Report configuration that will fail at send time.
 *
 * Brevo rejects a send from a sender address that has not been verified in
 * the account (Senders & IP > Senders). That rejection otherwise only
 * surfaces in the log at 07:00, by which point the missing email looks like
 * the cron never ran.
 */
function checkDeliveryConfig() {
  const problems = [];

  if (!getApiKey()) {
    problems.push("BREVO_API_KEY is not set - the digest cannot send.");
  }

  if (!process.env.DIGEST_FROM_EMAIL) {
    problems.push(
      "DIGEST_FROM_EMAIL is not set. Set it to a sender verified in Brevo " +
        "(app.brevo.com > Senders, Domains & Dedicated IPs).",
    );
  }

  return problems;
}

/**
 * Send one email through Brevo's transactional email API.
 * Returns { ok, id?, error? } instead of throwing, so a failed digest never
 * takes down the cron job or the request that triggered it.
 */
async function sendEmail({ to, bcc, subject, html, text, from, replyTo }) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      ok: false,
      error:
        "BREVO_API_KEY is not set. Add it to Backend/.env to enable the daily digest.",
    };
  }

  const toList = parseAddressList(to);

  if (toList.length === 0) {
    return { ok: false, error: "No recipient configured (DIGEST_TO_EMAIL)." };
  }

  const bccList = parseAddressList(bcc);

  const sender = parseAddress(
    from ||
      process.env.DIGEST_FROM_EMAIL ||
      "TechPulse <no-reply@techpulse.dev>",
  );

  try {
    const { data } = await brevoRequest({
      method: "post",
      url: BREVO_SEND_URL,
      data: {
        sender,
        to: toList,
        ...(bccList.length > 0 ? { bcc: bccList } : {}),
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo ? { replyTo: parseAddress(replyTo) } : {}),
      },
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 15000,
    });

    return {
      ok: true,
      id: data?.messageId || null,
      recipients: [...toList, ...bccList].map((r) => r.email),
    };
  } catch (err) {
    // Brevo reports validation and sender-verification problems in the body.
    const message =
      err.response?.data?.message || err.message || String(err);
    console.error("[Mailer] Brevo rejected the send:", message);
    return { ok: false, error: message };
  }
}

module.exports = {
  sendEmail,
  isEmailConfigured,
  checkDeliveryConfig,
};
