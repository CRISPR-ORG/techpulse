const axios = require("axios");

const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";
// Digest signups are restricted to the college domain.
const COLLEGE_EMAIL_PATTERN = /^[^\s@]+@iiitn\.ac\.in$/i;

/**
 * Brevo list that holds digest subscribers (id #3, "TechPulse" in the Brevo
 * dashboard). Homepage signups are added here directly - Brevo is the
 * source of truth for who receives the 7AM digest, not a local table.
 */
function getListId() {
  return Number(process.env.BREVO_DIGEST_LIST_ID || 3);
}

function getApiKey() {
  return process.env.BREVO_API_KEY || "";
}

function headers() {
  return {
    "api-key": getApiKey(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Add (or link) a contact to the digest list. Idempotent on re-subscribe. */
async function subscribe(email) {
  const normalized = normalizeEmail(email);
  if (!COLLEGE_EMAIL_PATTERN.test(normalized)) {
    return { ok: false, error: "Only @iiitn.ac.in college email addresses can subscribe." };
  }

  if (!getApiKey()) {
    return { ok: false, error: "BREVO_API_KEY is not set." };
  }

  try {
    await axios.post(
      BREVO_CONTACTS_URL,
      { email: normalized, listIds: [getListId()], updateEnabled: true },
      { headers: headers(), timeout: 15000 },
    );

    return { ok: true };
  } catch (err) {
    const message =
      err.response?.data?.message || err.message || String(err);
    console.error("[Subscribers] Brevo add-contact failed:", message);
    return { ok: false, error: message };
  }
}

/** Unlink a contact from the digest list without deleting the contact. */
async function unsubscribe(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ok: false, error: "Missing email." };
  }

  if (!getApiKey()) {
    return { ok: false, error: "BREVO_API_KEY is not set." };
  }

  try {
    await axios.put(
      `${BREVO_CONTACTS_URL}/${encodeURIComponent(normalized)}`,
      { unlinkListIds: [getListId()] },
      { headers: headers(), timeout: 15000 },
    );

    return { ok: true };
  } catch (err) {
    const message =
      err.response?.data?.message || err.message || String(err);
    console.error("[Subscribers] Brevo unlink-contact failed:", message);
    return { ok: false, error: message };
  }
}

/** All contact emails currently on the digest list, paginated. */
async function getActiveSubscriberEmails() {
  if (!getApiKey()) return [];

  const emails = [];
  const limit = 500;
  let offset = 0;

  try {
    for (;;) {
      const { data } = await axios.get(
        `${BREVO_CONTACTS_URL}/lists/${getListId()}/contacts`,
        {
          headers: headers(),
          params: { limit, offset },
          timeout: 15000,
        },
      );

      const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
      for (const contact of contacts) {
        if (contact?.email) emails.push(contact.email);
      }

      if (contacts.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    const message =
      err.response?.data?.message || err.message || String(err);
    console.error("[Subscribers] Brevo list fetch failed:", message);
  }

  return emails;
}

module.exports = {
  subscribe,
  unsubscribe,
  getActiveSubscriberEmails,
};
