/**
 * Daily tech news digest email.
 *
 * Written with table layout and inline styles on purpose: Gmail, Outlook and
 * most mobile clients strip <style> blocks, flexbox and CSS grid.
 */

const BRAND = {
  bg: "#0b0f14",
  panel: "#121821",
  border: "#1f2937",
  text: "#e6edf3",
  muted: "#8b98a5",
  accent: "#22c55e",
  accentSoft: "#16351f",
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Keep card copy to a readable length without cutting mid-word. */
function truncate(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : maxLength).trim()}...`;
}

function formatTime(value, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDate(value, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toDateString();
  }
}

function renderStory(item, index, timeZone) {
  const title = escapeHtml(item.title || "Untitled story");
  const description = escapeHtml(
    truncate(item.description || "Open the story for full source coverage.", 220),
  );
  const source = escapeHtml(item.source || "Unknown source");
  const time = escapeHtml(formatTime(item.publishedAt, timeZone));
  const alsoCovered =
    item.sourceCount > 1
      ? ` &middot; +${escapeHtml(item.sourceCount - 1)} more ${item.sourceCount === 2 ? "outlet" : "outlets"}`
      : "";
  const url = escapeHtml(item.url || "#");
  const hasLink = /^https?:\/\//i.test(item.url || "");

  return `
  <tr>
    <td style="padding:0 0 14px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:10px;">
        <tr>
          <td style="padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font:600 11px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.accent};letter-spacing:.08em;text-transform:uppercase;padding-bottom:8px;">
                  ${String(index + 1).padStart(2, "0")} &middot; ${source}${time ? ` &middot; ${time}` : ""}${alsoCovered}
                </td>
              </tr>
              <tr>
                <td style="font:700 17px/1.35 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};padding-bottom:8px;">
                  ${hasLink ? `<a href="${url}" style="color:${BRAND.text};text-decoration:none;">${title}</a>` : title}
                </td>
              </tr>
              <tr>
                <td style="font:400 14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
                  ${description}
                </td>
              </tr>
              ${
                hasLink
                  ? `<tr>
                <td style="padding-top:12px;">
                  <a href="${url}" style="display:inline-block;font:600 12px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.accent};background:${BRAND.accentSoft};border:1px solid ${BRAND.accent};border-radius:6px;padding:9px 14px;text-decoration:none;">READ STORY &rarr;</a>
                </td>
              </tr>`
                  : ""
              }
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildSubject(items, generatedAt, timeZone) {
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone,
  }).format(new Date(generatedAt));

  if (items.length === 0) {
    return `TechPulse Daily - ${dateLabel} - no new stories`;
  }

  const lead = truncate(items[0].title || "", 60);
  return `TechPulse Daily - ${dateLabel} - ${items.length} tech ${
    items.length === 1 ? "story" : "stories"
  }: ${lead}`;
}

function buildHtml({ items, generatedAt, timeZone, windowLabel, siteUrl }) {
  const dateLine = escapeHtml(formatDate(generatedAt, timeZone));
  const sentAt = escapeHtml(formatTime(generatedAt, timeZone));

  const body =
    items.length > 0
      ? items.map((item, i) => renderStory(item, i, timeZone)).join("")
      : `<tr><td style="padding:24px;background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:10px;font:400 14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
           No new tech stories were published in this window. The next digest will cover everything that lands today.
         </td></tr>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>TechPulse Daily</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(items.length)} tech ${items.length === 1 ? "story" : "stories"} from ${escapeHtml(windowLabel)}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">

          <tr>
            <td style="padding-bottom:20px;border-bottom:1px solid ${BRAND.border};">
              <div style="font:800 22px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};letter-spacing:-.02em;">
                TECHPULSE <span style="color:${BRAND.accent};">// DAILY</span>
              </div>
              <div style="font:400 13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};padding-top:6px;">
                ${dateLine} &middot; sent ${sentAt}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 0 16px 0;font:400 14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
              <strong style="color:${BRAND.text};">${items.length}</strong> tech
              ${items.length === 1 ? "story" : "stories"} from ${escapeHtml(windowLabel)}, newest first.
            </td>
          </tr>

          ${body}

          <tr>
            <td style="padding-top:12px;border-top:1px solid ${BRAND.border};font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
              Automated daily digest from TechPulse.
              ${siteUrl ? `<a href="${escapeHtml(siteUrl)}" style="color:${BRAND.accent};text-decoration:none;">Open the full feed &rarr;</a>` : ""}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative; improves deliverability and serves text-only clients. */
function buildText({ items, generatedAt, timeZone, windowLabel, siteUrl }) {
  const lines = [
    "TECHPULSE // DAILY",
    formatDate(generatedAt, timeZone),
    "",
    `${items.length} tech ${items.length === 1 ? "story" : "stories"} from ${windowLabel}, newest first.`,
    "",
  ];

  if (items.length === 0) {
    lines.push("No new tech stories were published in this window.");
  }

  items.forEach((item, index) => {
    const time = formatTime(item.publishedAt, timeZone);
    lines.push(
      `${String(index + 1).padStart(2, "0")}. ${item.title || "Untitled story"}`,
    );
    const also =
      item.sourceCount > 1 ? ` | +${item.sourceCount - 1} more outlets` : "";
    lines.push(
      `    ${item.source || "Unknown source"}${time ? ` | ${time}` : ""}${also}`,
    );
    if (item.description) lines.push(`    ${truncate(item.description, 200)}`);
    if (item.url && item.url !== "#") lines.push(`    ${item.url}`);
    lines.push("");
  });

  if (siteUrl) lines.push(`Full feed: ${siteUrl}`);

  return lines.join("\n");
}

function buildDigestEmail({
  items = [],
  generatedAt = new Date().toISOString(),
  timeZone = "Asia/Kolkata",
  windowLabel = "the last 24 hours",
  siteUrl = "",
}) {
  const context = { items, generatedAt, timeZone, windowLabel, siteUrl };

  return {
    subject: buildSubject(items, generatedAt, timeZone),
    html: buildHtml(context),
    text: buildText(context),
  };
}

module.exports = {
  buildDigestEmail,
};
