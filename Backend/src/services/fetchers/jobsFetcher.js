const axios = require("axios");

const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT = "TechPulse-Backend/1.0 (campus tech aggregator)";

// Remote OK's API terms require a visible link back to the listing on their
// site, which is why `applyUrl` always points at the source listing page.
const SOURCES = {
  REMOTIVE: "Remotive",
  ARBEITNOW: "Arbeitnow",
  REMOTEOK: "Remote OK",
  JOBICY: "Jobicy",
  HIMALAYAS: "Himalayas",
  EXA: "Exa",
};

const TECH_ROLE_KEYWORDS = [
  "engineer",
  "engineering",
  "developer",
  "development",
  "programmer",
  "software",
  "frontend",
  "front end",
  "front-end",
  "backend",
  "back end",
  "back-end",
  "fullstack",
  "full stack",
  "full-stack",
  "web dev",
  "mobile dev",
  "android",
  "ios",
  "flutter",
  "react",
  "angular",
  "vue",
  "svelte",
  "node",
  "python",
  "django",
  "java",
  "kotlin",
  "swift",
  "golang",
  "rust",
  "ruby",
  "rails",
  "php",
  "laravel",
  "dotnet",
  ".net",
  "c++",
  "typescript",
  "javascript",
  "devops",
  "sre",
  "site reliability",
  "platform",
  "infrastructure",
  "cloud",
  "aws",
  "azure",
  "kubernetes",
  "docker",
  "terraform",
  "data engineer",
  "data scientist",
  "data science",
  "machine learning",
  "deep learning",
  "ml engineer",
  "mlops",
  "ai engineer",
  "artificial intelligence",
  "nlp",
  "computer vision",
  "llm",
  "database",
  "sql",
  "analytics engineer",
  "qa engineer",
  "test engineer",
  "automation engineer",
  "sdet",
  "security engineer",
  "cybersecurity",
  "appsec",
  "penetration test",
  "blockchain",
  "solidity",
  "web3",
  "smart contract",
  "embedded",
  "firmware",
  "hardware engineer",
  "vlsi",
  "fpga",
  "robotics",
  "computer science",
  "architect",
  "technical lead",
  "tech lead",
  "cto",
  "sysadmin",
  "system administrator",
  "network engineer",
  "game developer",
  "unity",
  "unreal",
  "graphics",
  "compiler",
  "systems programmer",
];

// Titles that mention tech but are not engineering roles students apply to.
const NON_TECH_ROLE_KEYWORDS = [
  "sales",
  "account executive",
  "business development",
  "recruiter",
  "recruitment",
  "talent acquisition",
  "customer support",
  "customer success",
  "customer service",
  "call center",
  "telemarketing",
  "accountant",
  "accounting",
  "bookkeep",
  "payroll",
  "human resources",
  "hr manager",
  "office manager",
  "executive assistant",
  "receptionist",
  "warehouse",
  "equipment maintenance",
  "driver",
  "delivery",
  "cleaner",
  "housekeeping",
  "nurse",
  "nursing",
  "physician",
  "therapist",
  "dental",
  "pharmacy",
  "teacher",
  "tutor",
  "copywriter",
  "content writer",
  "social media manager",
  "seo specialist",
  "graphic designer",
  "video editor",
  "translator",
  "insurance agent",
  "real estate",
  "construction",
  "electrician",
  "plumber",
  "chef",
  "barista",
  "retail",
  "cashier",
  "security guard",
  // "engineer" is a broad positive signal, so exclude non-software engineering.
  "costing engineer",
  "civil engineer",
  "mechanical engineer",
  "chemical engineer",
  "structural engineer",
  "process engineer",
  "field engineer",
  "hvac",
  "maintenance engineer",
];

// Remotive ignores the `category` query param often enough that non-dev
// categories ("All others") leak through, so it is re-checked client side.
const REMOTIVE_DEV_CATEGORIES = new Set([
  "software development",
  "software dev",
  "devops",
  "devops / sysadmin",
  "data",
  "data analysis",
  "qa",
  "product",
  "design",
]);

function isDevCategory(category) {
  const normalized = normalizeText(category).toLowerCase();
  if (!normalized) return false;
  if (REMOTIVE_DEV_CATEGORIES.has(normalized)) return true;
  return /software|devops|sysadmin|data|engineer|qa/.test(normalized);
}

const INTERNSHIP_KEYWORDS = [
  "intern",
  "internship",
  "trainee",
  "apprentice",
  "graduate program",
  "campus hire",
  "summer analyst",
  "co-op",
];

const CONTRACT_KEYWORDS = [
  "contract",
  "contractor",
  "freelance",
  "freelancer",
  "part time",
  "part_time",
  "part-time",
  "temporary",
];

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(value) {
  return normalizeText(value)
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, (match) => HTML_ENTITIES[match] || match)
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return normalizeText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Split a title into comparable words. Keeps `+`, `#` and `.` so tokens like
 * "c++", "c#" and ".net" survive tokenization.
 */
function tokenize(value) {
  return new Set(
    normalizeText(value)
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((token) => token.replace(/\.+$/, ""))
      .filter(Boolean),
  );
}

const SINGLE_WORD_TECH_KEYWORDS = new Set(
  TECH_ROLE_KEYWORDS.filter((keyword) => !keyword.includes(" ")),
);
const MULTI_WORD_TECH_KEYWORDS = TECH_ROLE_KEYWORDS.filter((keyword) =>
  keyword.includes(" "),
);

/**
 * Job boards mix engineering roles with sales/support/ops listings, so decide
 * purely from the role title.
 *
 * Single words are matched per-token rather than by substring: a substring
 * check lets "cto" match "director" and "ops" match "operations".
 *
 * Tags are deliberately NOT a positive signal — Remote OK attaches a
 * grab-bag of tags ("golang", "infosec") to entirely non-technical listings.
 */
function isTechRole(role) {
  const title = normalizeText(role).toLowerCase();
  if (!title) return false;

  if (containsAny(title, NON_TECH_ROLE_KEYWORDS)) return false;

  if (containsAny(title, MULTI_WORD_TECH_KEYWORDS)) return true;

  for (const token of tokenize(title)) {
    if (SINGLE_WORD_TECH_KEYWORDS.has(token)) return true;
  }

  return false;
}

function detectType(...parts) {
  const blob = parts.map((part) => normalizeText(part).toLowerCase()).join(" ");

  if (containsAny(blob, INTERNSHIP_KEYWORDS)) return "INTERNSHIP";
  if (containsAny(blob, CONTRACT_KEYWORDS)) return "CONTRACT";
  return "FULL-TIME";
}

function detectMode(isRemoteFlag, ...parts) {
  const blob = parts.map((part) => normalizeText(part).toLowerCase()).join(" ");

  if (blob.includes("hybrid")) return "HYBRID";
  if (isRemoteFlag === true) return "REMOTE";
  if (blob.includes("remote") || blob.includes("anywhere")) return "REMOTE";
  if (isRemoteFlag === false && blob) return "ON-SITE";
  return blob ? "ON-SITE" : "REMOTE";
}

function toTitleCase(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((word) =>
      word.length > 2 && word === word.toLowerCase()
        ? word[0].toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
}

function formatSalaryRange(min, max) {
  const low = Number(min) || 0;
  const high = Number(max) || 0;

  if (low > 0 && high > 0) {
    return `$${Math.round(low / 1000)}k - $${Math.round(high / 1000)}k`;
  }
  if (high > 0) return `Up to $${Math.round(high / 1000)}k`;
  if (low > 0) return `From $${Math.round(low / 1000)}k`;
  return "See listing";
}

function cleanTags(tags, limit = 4) {
  const seen = new Set();
  const cleaned = [];

  for (const tag of Array.isArray(tags) ? tags : []) {
    const label = normalizeText(tag).replace(/\s+/g, " ");
    if (!label || label.length > 22) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    cleaned.push(label.toUpperCase());
    if (cleaned.length >= limit) break;
  }

  return cleaned;
}

function toIsoDate(value) {
  if (!value) return null;

  // Remote OK ships unix seconds, the rest ship ISO-ish strings.
  const timestamp =
    typeof value === "number"
      ? value * 1000
      : /^\d+$/.test(String(value))
        ? Number(value) * 1000
        : Date.parse(value);

  if (!Number.isFinite(timestamp) || Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function buildOpportunity({
  sourceId,
  source,
  role,
  company,
  location,
  mode,
  type,
  stipend,
  tags,
  applyUrl,
  postedAt,
}) {
  return {
    id: `${source.slice(0, 3).toUpperCase()}-${sourceId}`,
    type,
    company: decodeEntities(company) || "Unknown Company",
    role: decodeEntities(role) || "Tech Opportunity",
    location: decodeEntities(location) || "Remote/Global",
    mode,
    stipend: stipend || "See listing",
    deadline: "Rolling",
    tags: tags.length > 0 ? tags : ["TECH"],
    applyUrl,
    source,
    postedAt,
  };
}

async function fetchFromRemotive(limit) {
  const { data } = await axios.get("https://remotive.com/api/remote-jobs", {
    params: { category: "software-dev", limit: Math.max(limit * 4, 200) },
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeout: REQUEST_TIMEOUT_MS,
  });

  return (data?.jobs || [])
    .filter((job) => isDevCategory(job?.category) && isTechRole(job?.title))
    .slice(0, limit)
    .map((job) =>
      buildOpportunity({
        sourceId: job.id,
        source: SOURCES.REMOTIVE,
        role: normalizeText(job.title),
        company: normalizeText(job.company_name),
        location: normalizeText(job.candidate_required_location) || "Remote/Global",
        mode: detectMode(true, job.candidate_required_location),
        type: detectType(job.title, job.job_type),
        stipend: normalizeText(job.salary) || "See listing",
        tags: cleanTags([job.category, ...(job.tags || [])]),
        applyUrl: normalizeText(job.url),
        postedAt: toIsoDate(job.publication_date),
      }),
    );
}

async function fetchFromArbeitnow(limit) {
  const { data } = await axios.get(
    "https://www.arbeitnow.com/api/job-board-api",
    {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  return (data?.data || [])
    .filter((job) => isTechRole(job?.title))
    .slice(0, limit)
    .map((job) =>
      buildOpportunity({
        sourceId: normalizeText(job.slug).slice(-24) || normalizeText(job.title),
        source: SOURCES.ARBEITNOW,
        role: normalizeText(job.title),
        company: toTitleCase(job.company_name),
        location: normalizeText(job.location) || "Europe",
        mode: detectMode(job.remote === true, job.location),
        type: detectType(job.title, (job.job_types || []).join(" ")),
        stipend: "See listing",
        tags: cleanTags(job.tags),
        applyUrl: normalizeText(job.url),
        postedAt: toIsoDate(job.created_at),
      }),
    );
}

async function fetchFromRemoteOk(limit) {
  const { data } = await axios.get("https://remoteok.com/api", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeout: REQUEST_TIMEOUT_MS,
  });

  // The first array entry is Remote OK's legal notice, not a job.
  const jobs = (Array.isArray(data) ? data : []).filter((job) => job?.id);

  return jobs
    .filter((job) => isTechRole(job?.position))
    .slice(0, limit)
    .map((job) =>
      buildOpportunity({
        sourceId: job.id,
        source: SOURCES.REMOTEOK,
        role: normalizeText(job.position),
        company: normalizeText(job.company),
        location: normalizeText(job.location) || "Remote/Global",
        mode: detectMode(true, job.location),
        type: detectType(job.position, (job.tags || []).join(" ")),
        stipend: formatSalaryRange(job.salary_min, job.salary_max),
        tags: cleanTags(job.tags),
        applyUrl: normalizeText(job.url) || normalizeText(job.apply_url),
        postedAt: toIsoDate(job.epoch || job.date),
      }),
    );
}

async function fetchFromJobicy(limit) {
  const { data } = await axios.get("https://jobicy.com/api/v2/remote-jobs", {
    params: { count: Math.min(Math.max(limit, 50), 100), industry: "engineering" },
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeout: REQUEST_TIMEOUT_MS,
  });

  return (data?.jobs || [])
    .filter((job) => isTechRole(job?.jobTitle))
    .slice(0, limit)
    .map((job) =>
      buildOpportunity({
        sourceId: job.id,
        source: SOURCES.JOBICY,
        role: normalizeText(job.jobTitle),
        company: normalizeText(job.companyName),
        location: normalizeText(job.jobGeo) || "Remote/Global",
        mode: detectMode(true, job.jobGeo),
        type: detectType(job.jobTitle, (job.jobType || []).join(" "), job.jobLevel),
        stipend: "See listing",
        tags: cleanTags([...(job.jobIndustry || []), ...(job.jobType || [])]),
        applyUrl: normalizeText(job.url),
        postedAt: toIsoDate(job.pubDate),
      }),
    );
}

async function fetchFromHimalayas(limit) {
  const { data } = await axios.get("https://himalayas.app/jobs/api", {
    params: { limit: Math.min(Math.max(limit, 50), 100) },
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    timeout: REQUEST_TIMEOUT_MS,
  });

  return (data?.jobs || [])
    .filter((job) => isTechRole(job?.title))
    .slice(0, limit)
    .map((job) =>
      buildOpportunity({
        sourceId: normalizeText(job.guid).slice(-24) || normalizeText(job.title),
        source: SOURCES.HIMALAYAS,
        role: normalizeText(job.title),
        company: normalizeText(job.companyName),
        location:
          (job.locationRestrictions || []).join(", ") || "Remote/Global",
        mode: detectMode(true, (job.locationRestrictions || []).join(" ")),
        type: detectType(
          job.title,
          job.employmentType,
          (job.seniority || []).join(" "),
        ),
        stipend: formatSalaryRange(job.minSalary, job.maxSalary),
        tags: cleanTags([
          ...(job.parentCategories || []),
          ...(job.categories || []),
        ]),
        applyUrl: normalizeText(job.applicationLink) || normalizeText(job.guid),
        postedAt: toIsoDate(job.pubDate),
      }),
    );
}

function parseCompanyAndRole(title = "") {
  const normalized = normalizeText(title);
  if (!normalized) {
    return { company: "Unknown Company", role: "Tech Opportunity" };
  }

  for (const separator of [" at ", " @ ", " - ", " | "]) {
    const index = normalized.toLowerCase().indexOf(separator);
    if (index <= 0) continue;

    const left = normalized.slice(0, index).trim();
    const right = normalized.slice(index + separator.length).trim();

    if (separator === " at " || separator === " @ ") {
      return { role: left, company: right || "Unknown Company" };
    }
    return { company: left, role: right || left };
  }

  return { company: "Unknown Company", role: normalized };
}

/**
 * Optional enrichment. Only runs when EXA_API_KEY is configured; the keyless
 * boards above are what keep the section populated by default.
 */
async function fetchFromExa(limit) {
  const exaApiKey = process.env.EXA_API_KEY;
  if (!exaApiKey) return [];

  const { data } = await axios.post(
    "https://api.exa.ai/search",
    {
      query:
        "latest software engineering internship and developer job openings India and remote",
      type: "auto",
      numResults: Math.min(limit, 40),
      contents: { highlights: { maxCharacters: 2000 }, maxAgeHours: 48 },
    },
    {
      headers: { "x-api-key": exaApiKey, "Content-Type": "application/json" },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  return (data?.results || [])
    .map((item, index) => {
      const { company, role } = parseCompanyAndRole(item?.title);
      if (!isTechRole(role)) return null;

      const context = stripHtml(item?.text || item?.highlights?.[0] || "");

      return buildOpportunity({
        sourceId: normalizeText(item?.id) || `exa-${index}`,
        source: SOURCES.EXA,
        role,
        company,
        location: "Remote/Global",
        mode: detectMode(undefined, context),
        type: detectType(role, context),
        stipend: "See listing",
        tags: cleanTags(["Live", "Tech"]),
        applyUrl: normalizeText(item?.url),
        postedAt: toIsoDate(item?.publishedDate),
      });
    })
    .filter(Boolean);
}

function dedupeOpportunities(items) {
  const byUrl = new Set();
  const byRoleCompany = new Set();
  const unique = [];

  for (const item of items) {
    const url = normalizeText(item?.applyUrl);
    if (!url || !/^https?:\/\//i.test(url)) continue;

    const urlKey = url.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
    if (byUrl.has(urlKey)) continue;

    const roleKey = `${item.role} @ ${item.company}`.toLowerCase();
    if (byRoleCompany.has(roleKey)) continue;

    byUrl.add(urlKey);
    byRoleCompany.add(roleKey);
    unique.push(item);
  }

  return unique;
}

function sortByRecency(items) {
  return items.sort((a, b) => {
    const aTime = a.postedAt ? Date.parse(a.postedAt) : 0;
    const bTime = b.postedAt ? Date.parse(b.postedAt) : 0;
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

/**
 * Interleave sources so the first page is not dominated by one board.
 */
function interleaveBySource(items) {
  const buckets = new Map();

  for (const item of items) {
    if (!buckets.has(item.source)) buckets.set(item.source, []);
    buckets.get(item.source).push(item);
  }

  const lists = [...buckets.values()];
  const merged = [];
  let cursor = 0;

  while (merged.length < items.length) {
    let pushedThisRound = false;

    for (const list of lists) {
      if (cursor < list.length) {
        merged.push(list[cursor]);
        pushedThisRound = true;
      }
    }

    if (!pushedThisRound) break;
    cursor += 1;
  }

  return merged;
}

/**
 * Fetch live tech jobs from every configured board.
 * All primary boards are keyless, so this works with no API credentials.
 */
async function fetchTechJobs(limit = 120) {
  // Pull generously from each board: filtering discards most listings, so a
  // per-source cap near `limit` would starve the aggregate result.
  const perSource = Math.max(60, limit);

  const tasks = [
    { name: SOURCES.REMOTIVE, run: () => fetchFromRemotive(perSource) },
    { name: SOURCES.ARBEITNOW, run: () => fetchFromArbeitnow(perSource) },
    { name: SOURCES.REMOTEOK, run: () => fetchFromRemoteOk(perSource) },
    { name: SOURCES.JOBICY, run: () => fetchFromJobicy(perSource) },
    { name: SOURCES.HIMALAYAS, run: () => fetchFromHimalayas(perSource) },
    { name: SOURCES.EXA, run: () => fetchFromExa(perSource) },
  ];

  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  const collected = [];

  settled.forEach((result, index) => {
    const sourceName = tasks[index].name;

    if (result.status === "fulfilled") {
      const jobs = result.value || [];
      if (jobs.length > 0) {
        console.log(`[Jobs] ${sourceName} -> ${jobs.length} tech roles`);
      }
      collected.push(...jobs);
      return;
    }

    // Exa is optional; a missing key resolves to [] rather than rejecting.
    console.error(
      `[Jobs] ${sourceName} failed:`,
      result.reason?.message || result.reason,
    );
  });

  const unique = dedupeOpportunities(collected);
  const ordered = interleaveBySource(sortByRecency(unique));

  console.log(`[Jobs] total unique tech opportunities: ${ordered.length}`);
  return ordered.slice(0, limit);
}

module.exports = {
  fetchTechJobs,
  isTechRole,
  SOURCES,
};
