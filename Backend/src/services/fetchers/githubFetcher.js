const axios = require("axios");

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 15000;

// GitHub's search API allows 10 requests/hour unauthenticated and 30/minute
// with a token. Results are cached for a day, so the unauthenticated budget is
// enough — a token simply widens the margin.
const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
];

function buildHeaders() {
  const headers = {
    "User-Agent": "TechPulse-Backend/1.0",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Only send the header when a token exists. Sending `token undefined`
  // makes GitHub reject the request outright with a 401, which is worse than
  // not authenticating at all.
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function repoFromApiUrl(repositoryUrl) {
  const parts = String(repositoryUrl || "").split("/");
  return parts.length >= 2 ? parts.slice(-2).join("/") : "unknown/repo";
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function githubSearch(path, params) {
  const { data } = await axios.get(`${GITHUB_API}${path}`, {
    params,
    headers: buildHeaders(),
    timeout: REQUEST_TIMEOUT_MS,
  });

  return data;
}

function normalizeIssue(item) {
  const labels = (item.labels || [])
    .filter((label) => label && label.name)
    .slice(0, 5)
    .map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color || null,
    }));

  return {
    id: item.id,
    type: "ISSUE",
    title: String(item.title || "").trim(),
    repoName: repoFromApiUrl(item.repository_url),
    url: item.html_url,
    html_url: item.html_url,
    comments: item.comments || 0,
    createdAt: item.created_at || null,
    author: item.user?.login || null,
    labels,
  };
}

function normalizeRepo(item) {
  return {
    id: `repo-${item.id}`,
    type: "REPO",
    name: item.name,
    repoName: item.full_name,
    description: String(item.description || "").trim(),
    language: item.language || null,
    stars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    openIssues: item.open_issues_count || 0,
    topics: (item.topics || []).slice(0, 5),
    url: item.html_url,
    html_url: item.html_url,
    pushedAt: item.pushed_at || null,
    owner: item.owner?.login || null,
  };
}

/**
 * Beginner-friendly issues that are genuinely still open for work.
 *
 * `comments:<5` filters out issues already being discussed (and usually
 * already claimed), which is the common complaint about "good first issue"
 * lists — most of the top results are months old and taken.
 */
async function fetchGoodFirstIssues(perLanguage = 12) {
  const since = daysAgoIso(60);

  const searches = LANGUAGES.map((language) =>
    githubSearch("/search/issues", {
      q: [
        "is:issue",
        "is:open",
        'label:"good first issue"',
        `language:${language}`,
        "comments:<5",
        "no:assignee",
        `created:>${since}`,
      ].join(" "),
      sort: "created",
      order: "desc",
      per_page: perLanguage,
    }).then((data) => ({ language, data })),
  );

  const settled = await Promise.allSettled(searches);
  const issues = [];
  let totalCount = 0;

  settled.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      console.error(
        `[GitHub] ${LANGUAGES[index]} issue search failed:`,
        result.reason?.response?.status || result.reason?.message,
      );
      return;
    }

    const { language, data } = result.value;
    totalCount += data.total_count || 0;

    for (const item of data.items || []) {
      issues.push({ ...normalizeIssue(item), language });
    }
  });

  return { issues, totalCount };
}

/** Active, well-starred repositories — the "what should I look at" panel. */
async function fetchTrendingRepos(limit = 18) {
  const data = await githubSearch("/search/repositories", {
    q: `stars:>1000 pushed:>${daysAgoIso(7)}`,
    sort: "stars",
    order: "desc",
    per_page: limit,
  });

  return (data.items || []).map(normalizeRepo);
}

/** Interleave languages so one ecosystem does not fill the whole list. */
function interleaveByLanguage(issues) {
  const buckets = new Map();

  for (const issue of issues) {
    if (!buckets.has(issue.language)) buckets.set(issue.language, []);
    buckets.get(issue.language).push(issue);
  }

  const lists = [...buckets.values()];
  const merged = [];
  let cursor = 0;

  while (merged.length < issues.length) {
    let pushed = false;

    for (const list of lists) {
      if (cursor < list.length) {
        merged.push(list[cursor]);
        pushed = true;
      }
    }

    if (!pushed) break;
    cursor += 1;
  }

  return merged;
}

/**
 * Everything the Open Source page needs, in one payload.
 * Works with no credentials; GITHUB_TOKEN only raises the rate limit.
 */
async function fetchOpenSourceData() {
  const startedAt = Date.now();

  const [issuesResult, reposResult] = await Promise.allSettled([
    fetchGoodFirstIssues(),
    fetchTrendingRepos(),
  ]);

  const issuesPayload =
    issuesResult.status === "fulfilled"
      ? issuesResult.value
      : { issues: [], totalCount: 0 };

  const repos = reposResult.status === "fulfilled" ? reposResult.value : [];

  if (reposResult.status === "rejected") {
    console.error(
      "[GitHub] Repo search failed:",
      reposResult.reason?.response?.status || reposResult.reason?.message,
    );
  }

  const seen = new Set();
  const issues = interleaveByLanguage(issuesPayload.issues).filter((issue) => {
    if (!issue.url || seen.has(issue.url)) return false;
    seen.add(issue.url);
    return true;
  });

  console.log(
    `[GitHub] ${issues.length} issues + ${repos.length} repos in ${Date.now() - startedAt}ms`,
  );

  return {
    items: issues,
    repos,
    total_count: issuesPayload.totalCount,
    languages: LANGUAGES,
    authenticated: Boolean(process.env.GITHUB_TOKEN),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  fetchOpenSourceData,
  fetchGoodFirstIssues,
  fetchTrendingRepos,
};
