const axios = require("axios");

const RETRY_DELAY_MS = 1500;
const MAX_ATTEMPTS = 3;

// Cold-start DNS/connection flakiness seen in Vercel's serverless runtime
// when resolving api.brevo.com - transient, clears on retry.
const TRANSIENT_ERROR_CODES = new Set([
  "EBUSY",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ETIMEDOUT",
]);

function isUnrecognisedIpError(err) {
  return /unrecognised ip address/i.test(err?.response?.data?.message || "");
}

function isTransientNetworkError(err) {
  return TRANSIENT_ERROR_CODES.has(err?.code);
}

/**
 * Two known-transient Brevo/network failures, both cleared by retrying:
 *  - Brevo rejects the very first call from an IP it has never seen with a
 *    one-off "unrecognised IP address" error, then accepts the identical
 *    call moments later - observed even with IP-authorization blocking
 *    turned off in the dashboard.
 *  - Vercel's serverless runtime occasionally fails DNS resolution for
 *    api.brevo.com on a cold start (`getaddrinfo EBUSY`/`ENOTFOUND`/etc.),
 *    independent of the IP issue above.
 * Vercel's rotating outbound IPs and per-invocation cold starts mean either
 * can hit on essentially any given call, so this retries a few times rather
 * than assuming one is enough.
 */
async function brevoRequest(config) {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await axios(config);
    } catch (err) {
      lastErr = err;

      const retryable = isUnrecognisedIpError(err) || isTransientNetworkError(err);
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw lastErr;
}

module.exports = { brevoRequest };
