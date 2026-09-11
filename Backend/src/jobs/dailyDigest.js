const { storiesService, articlesService, subscribersService } = require("../models");
const { buildDigestEmail } = require("../services/email/digestTemplate");
const { sendEmail, isEmailConfigured } = require("../services/email/mailer");
const {
  cleanDescription,
  decodeEntities,
} = require("../services/utils/sanitizeText");

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_RECIPIENT = "bt25csh002@iiitn.ac.in";

// A 7 AM digest covering only "since midnight" can be nearly empty. When the
// calendar day is that thin, widen to 24 hours so the email is still useful.
const MIN_STORIES_FOR_CALENDAR_DAY = 5;
const MAX_STORIES_PER_DIGEST = 25;
// Wide enough to cover a full day of ingest (~1,200 stories/run across 60
// feeds) so the ranking picks from everything published, not just the newest
// slice of it.
const STORY_SCAN_LIMIT = Number(process.env.DIGEST_SCAN_LIMIT || 1500);

function getTimezone() {
  return process.env.DIGEST_TIMEZONE || DEFAULT_TIMEZONE;
}

/**
 * Everyone who should get the digest: homepage subscribers plus the
 * operator's own address (DIGEST_TO_EMAIL), deduped. Falls back to
 * DEFAULT_RECIPIENT only when neither source has anyone yet.
 */
async function getRecipients() {
  const subscribers = await subscribersService.getActiveSubscriberEmails();
  const adminEmails = String(process.env.DIGEST_TO_EMAIL || "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  const recipients = new Set([...subscribers, ...adminEmails]);

  if (recipients.size === 0) {
    recipients.add(DEFAULT_RECIPIENT);
  }

  return [...recipients];
}

/**
 * Start of the current calendar day in the configured timezone,
 * returned as a UTC epoch so it can be compared against stored timestamps.
 */
function startOfTodayUtc(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(now);

  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);

  // Offset between the wall clock in `timeZone` and UTC at this instant.
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = asUtc - now.getTime();

  const localMidnight = Date.UTC(get("year"), get("month") - 1, get("day"));
  return localMidnight - offsetMs;
}

function toTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Outlets whose coverage is broadly significant rather than niche. Used only
// to break ties between stories of otherwise similar freshness.
const SOURCE_WEIGHTS = {
  Techmeme: 3.0,
  "Hacker News": 2.6,
  "HN Best": 2.6,
  TechCrunch: 2.4,
  "The Verge": 2.3,
  "Ars Technica": 2.3,
  Wired: 2.2,
  "MIT Tech Review": 2.2,
  Reuters: 2.2,
  "NYT Technology": 2.1,
  "BBC Technology": 2.0,
  "Guardian Tech": 2.0,
  VentureBeat: 1.9,
  "The Register": 1.9,
  Engadget: 1.8,
  "IEEE Spectrum": 1.8,
  "Krebs on Security": 1.8,
  BleepingComputer: 1.7,
  "The Hacker News": 1.7,
  ZDNet: 1.6,
  "ET Tech": 1.6,
  "Mint Tech": 1.6,
  Inc42: 1.5,
  YourStory: 1.5,
  Lobsters: 1.5,
  "OpenAI Blog": 1.8,
  DeepMind: 1.8,
  "Google Research": 1.6,
  "Cloudflare Blog": 1.5,
  "GitHub Blog": 1.5,
};

// Community and personal-blog feeds: valuable in the feed, but a changelog
// post should not outrank a wire story in a "top news of the day" email.
const LOW_SIGNAL_SOURCES = {
  "Dev.to": 0.25,
  "Reddit r/webdev": 0.3,
  "HN Ask": 0.35,
  "HN Show": 0.4,
  Hackaday: 0.6,
  "Business Insider Tech": 0.5,
  "ScienceDaily Computers": 0.6,
  "Nature Computing": 0.7,
};

const DEFAULT_SOURCE_WEIGHT = 1.0;

/**
 * Score a story for the digest.
 *
 * Freshness dominates - this is a daily paper, not an archive - but a story
 * carried by several outlets, or by one with broad reach, outranks an equally
 * recent post from a single niche blog.
 */
function scoreStory(item, now) {
  const ageHours = Math.max(0, (now - item.timestamp) / 3600000);

  // Halves roughly every 8 hours, so this morning beats last evening.
  const freshness = Math.pow(0.5, ageHours / 8);

  const sourceWeight =
    SOURCE_WEIGHTS[item.source] ||
    LOW_SIGNAL_SOURCES[item.source] ||
    DEFAULT_SOURCE_WEIGHT;

  // Independent outlets covering the same headline is the strongest available
  // signal that a story matters.
  const distinctOutlets = item.sources ? item.sources.size : 1;
  const corroboration = 1 + Math.log2(Math.max(1, distinctOutlets));

  return freshness * 10 * sourceWeight * corroboration;
}

/** Group near-identical headlines so one story does not fill the email. */
function headlineKey(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6)
    .sort()
    .join("-");
}

function collapseDuplicates(items) {
  const groups = new Map();

  for (const item of items) {
    const key = headlineKey(item.title) || `id:${item.id}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { ...item, sources: new Set([item.source]) });
      continue;
    }

    // Only distinct outlets count. Several posts from one blog landing in the
    // same group is repetition, not corroboration.
    existing.sources.add(item.source);

    if (item.timestamp > existing.timestamp) {
      existing.timestamp = item.timestamp;
      existing.publishedAt = item.publishedAt;
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    sourceCount: group.sources.size,
  }));
}

/**
 * Collect the tech stories to feature, newest first, each paired with its
 * lead article so the email can show a real source, blurb and link.
 */
async function collectDigestStories(now = new Date()) {
  const timeZone = getTimezone();

  // Supabase returns at most 1000 rows per request, so the scan is paged.
  const PAGE = 500;
  const stories = [];

  while (stories.length < STORY_SCAN_LIMIT) {
    const page = await storiesService.getStories(null, PAGE, stories.length);
    if (!Array.isArray(page) || page.length === 0) break;

    stories.push(...page);
    if (page.length < PAGE) break;
  }

  const hydrated = await Promise.all(
    stories.map(async (story) => {
      let lead = null;

      try {
        const articles = await articlesService.getArticlesByStoryId(
          story.id,
          1,
          0,
        );
        lead = articles[0] || null;
      } catch {
        lead = null;
      }

      const publishedAt =
        lead?.published_at || story.effective_published_at || story.created_at;

      return {
        id: story.id,
        title: decodeEntities(lead?.title || story.title),
        description: cleanDescription(lead?.description),
        source: lead?.source_name || "",
        url: lead?.url || "",
        publishedAt,
        timestamp: toTimestamp(publishedAt),
      };
    }),
  );

  const ordered = hydrated
    .filter((item) => item.title && /^https?:\/\//i.test(item.url))
    .sort((a, b) => b.timestamp - a.timestamp);

  const todayStart = startOfTodayUtc(now, timeZone);
  const nowMs = now.getTime();

  const todays = ordered.filter((item) => item.timestamp >= todayStart);
  const useToday = todays.length >= MIN_STORIES_FOR_CALENDAR_DAY;

  const inWindow = useToday
    ? todays
    : ordered.filter((item) => item.timestamp >= nowMs - 24 * 60 * 60 * 1000);

  // Rank the window, then restore chronological order for reading. Picking the
  // top stories and presenting them newest-first is what makes this a digest
  // rather than the first 25 rows of the feed.
  const ranked = collapseDuplicates(inWindow)
    .map((item) => ({ ...item, score: scoreStory(item, nowMs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_STORIES_PER_DIGEST)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    items: ranked,
    windowLabel: useToday ? "today" : "the last 24 hours",
    timeZone,
    scanned: ordered.length,
    windowSize: inWindow.length,
  };
}

/**
 * Build and send the daily tech news digest.
 * Always resolves; failures are reported in the returned object.
 */
async function runDailyDigest({ dryRun = false } = {}) {
  const startedAt = new Date();
  console.log(`[Digest] Building daily digest at ${startedAt.toISOString()}`);

  try {
    const { items, windowLabel, timeZone, scanned, windowSize } =
      await collectDigestStories(startedAt);

    const email = buildDigestEmail({
      items,
      generatedAt: startedAt.toISOString(),
      timeZone,
      windowLabel,
      siteUrl: process.env.DIGEST_SITE_URL || "",
    });

    console.log(
      `[Digest] top ${items.length} of ${windowSize} stories from ${windowLabel} (scanned ${scanned}) | subject: ${email.subject}`,
    );

    if (dryRun) {
      return { ok: true, dryRun: true, count: items.length, ...email };
    }

    if (!isEmailConfigured()) {
      const error =
        "BREVO_API_KEY is not set - skipping send. Add it to Backend/.env.";
      console.warn(`[Digest] ${error}`);
      return { ok: false, count: items.length, error };
    }

    // Recipients ride in Bcc (with the first as the visible To) so
    // subscribers' addresses are never exposed to one another.
    const [primaryRecipient, ...otherRecipients] = await getRecipients();
    const result = await sendEmail({
      to: primaryRecipient,
      bcc: otherRecipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.ok) {
      console.log(
        `[Digest] Sent to ${1 + otherRecipients.length} recipient(s) (id: ${result.id})`,
      );
    } else {
      console.error(`[Digest] Send failed: ${result.error}`);
    }

    return { ...result, count: items.length, subject: email.subject };
  } catch (err) {
    const message = err?.message || String(err);
    console.error("[Digest] Unexpected failure:", message);
    return { ok: false, error: message };
  }
}

module.exports = {
  runDailyDigest,
  collectDigestStories,
  startOfTodayUtc,
};
