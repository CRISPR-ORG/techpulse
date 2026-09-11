const axios = require("axios");

const IP_DETECTION_RETRY_DELAY_MS = 1500;

function isUnrecognisedIpError(err) {
  return /unrecognised ip address/i.test(err?.response?.data?.message || "");
}

/**
 * Brevo rejects the very first call from an IP it has never seen with a
 * one-off "unrecognised IP address" error, then accepts the identical call
 * moments later - observed even with IP-authorization blocking turned off
 * in the dashboard. Vercel's serverless functions rotate through many
 * outbound IPs, so this surfaces on close to the first request from any
 * fresh instance. One retry clears it.
 */
async function brevoRequest(config) {
  try {
    return await axios(config);
  } catch (err) {
    if (!isUnrecognisedIpError(err)) throw err;

    await new Promise((resolve) => setTimeout(resolve, IP_DETECTION_RETRY_DELAY_MS));
    return axios(config);
  }
}

module.exports = { brevoRequest };
