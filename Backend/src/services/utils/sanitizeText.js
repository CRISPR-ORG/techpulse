/**
 * Feed descriptions arrive with source-specific noise: HTML markup from RSS
 * summaries, and Hacker News boilerplate ("Article URL / Comments URL /
 * Points / # Comments") that reads as a metadata dump wherever it is shown.
 */

const HN_METADATA_LINE =
  /^\s*(article url|comments url|points|#\s*comments)\s*:?.*$/gim;

function stripHtml(value) {
  return String(value == null ? "" : value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ");
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&hellip;": "...",
  "&mdash;": "-",
  "&ndash;": "-",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
};

function decodeEntities(value) {
  return String(value || "")
    .replace(
      /&(?:amp|lt|gt|quot|apos|#39|nbsp|hellip|mdash|ndash|rsquo|lsquo|ldquo|rdquo);/g,
      (match) => ENTITIES[match] || match,
    )
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);
      return Number.isFinite(number) ? String.fromCharCode(number) : "";
    });
}

/**
 * Turn a raw feed description into a single clean paragraph, trimmed to a readable length.
 * Returns "" when nothing meaningful survives, so callers can fall back.
 */
function cleanDescription(value, maxLength = 260) {
  const withoutMetadata = String(value == null ? "" : value).replace(
    HN_METADATA_LINE,
    " ",
  );

  const text = decodeEntities(stripHtml(withoutMetadata))
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Leftovers like "-" or "..." are worse than showing nothing.
  if (text.length < 12) return "";
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const clean =
    lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated;
  return `${clean.trim()}...`;
}

module.exports = {
  cleanDescription,
  decodeEntities,
};
