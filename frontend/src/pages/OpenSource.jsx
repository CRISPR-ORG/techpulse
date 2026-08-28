import { useState, useEffect, useMemo } from "react";
import { openSourceApi } from "../services/apiClient";
import "./OpenSource.css";

const VIEWS = [
  { key: "issues", label: "// GOOD FIRST ISSUES" },
  { key: "repos", label: "// TRENDING REPOS" },
];

function formatCount(value) {
  const number = Number(value) || 0;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;
  return String(number);
}

function toRelativeTime(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return "";

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** GitHub label colours are raw hex without the leading '#'. */
function labelColor(color) {
  return color ? `#${color}` : "var(--text-secondary)";
}

export default function OpenSource() {
  const [data, setData] = useState({ items: [], repos: [], total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("issues");
  const [language, setLanguage] = useState("ALL");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const payload = await openSourceApi.getOpportunities();
        if (cancelled) return;

        setData({
          items: Array.isArray(payload?.items) ? payload.items : [],
          repos: Array.isArray(payload?.repos) ? payload.repos : [],
          total_count: payload?.total_count || 0,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load open source data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const languages = useMemo(() => {
    const found = new Set(data.items.map((item) => item.language).filter(Boolean));
    return ["ALL", ...[...found].sort()];
  }, [data.items]);

  const visibleIssues = useMemo(() => {
    if (language === "ALL") return data.items;
    return data.items.filter((item) => item.language === language);
  }, [data.items, language]);

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">05 //</p>
          <h1 className="section-title">
            open source. <span className="highlight">contribute.</span>
          </h1>
          <p className="page-desc">
            {loading
              ? "Scanning GitHub for contribution opportunities..."
              : error
                ? "Live GitHub data is unavailable right now."
                : `${data.items.length} unassigned beginner issues and ${data.repos.length} active repos, pulled live from GitHub.`}
          </p>
        </div>

        <div className="os-toggle-row">
          <div className="os-toggle" role="tablist" aria-label="Open source sections">
            {VIEWS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={view === entry.key}
                className={`os-toggle-btn ${view === entry.key ? "active" : ""}`}
                onClick={() => setView(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {view === "issues" && !loading && !error && languages.length > 1 ? (
            <div className="os-lang-filter">
              {languages.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={`os-lang-btn ${language === entry ? "active" : ""}`}
                  onClick={() => setLanguage(entry)}
                >
                  {entry}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="card os-state">
            <span className="pulse-dot" />
            <span>Fetching live opportunities from GitHub...</span>
          </div>
        ) : error ? (
          <div className="card os-state">{error}</div>
        ) : view === "issues" ? (
          visibleIssues.length === 0 ? (
            <div className="card os-state">No open issues for this filter.</div>
          ) : (
            <div className="grid-3">
              {visibleIssues.map((item, index) => (
                <article
                  key={item.id}
                  className="card os-card"
                  style={{ animationDelay: `${Math.min(index, 12) * 0.05}s` }}
                >
                  <div className="os-card-top">
                    <span className="tag tag--blue">{item.repoName}</span>
                    {item.language ? (
                      <span className="tag tag--dim">{item.language}</span>
                    ) : null}
                  </div>

                  <h3 className="os-card-title">{item.title}</h3>

                  <div className="os-labels">
                    {(item.labels || []).map((label) => (
                      <span
                        key={label.id}
                        className="tag tag--dim os-label"
                        style={{
                          color: labelColor(label.color),
                          borderColor: labelColor(label.color),
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>

                  <div className="os-card-meta">
                    <span>{item.comments} comments</span>
                    <span>{toRelativeTime(item.createdAt)}</span>
                  </div>

                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--green os-card-cta"
                  >
                    <span>// VIEW ISSUE</span>
                  </a>
                </article>
              ))}
            </div>
          )
        ) : data.repos.length === 0 ? (
          <div className="card os-state">No trending repositories right now.</div>
        ) : (
          <div className="grid-3">
            {data.repos.map((repo, index) => (
              <article
                key={repo.id}
                className="card os-card"
                style={{ animationDelay: `${Math.min(index, 12) * 0.05}s` }}
              >
                <div className="os-card-top">
                  <span className="tag tag--green">{repo.repoName}</span>
                  {repo.language ? (
                    <span className="tag tag--dim">{repo.language}</span>
                  ) : null}
                </div>

                <p className="os-repo-desc">
                  {repo.description || "No description provided."}
                </p>

                <div className="os-labels">
                  {(repo.topics || []).map((topic) => (
                    <span key={topic} className="tag tag--dim os-label">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="os-card-meta">
                  <span>★ {formatCount(repo.stars)}</span>
                  <span>⑂ {formatCount(repo.forks)}</span>
                  <span>{formatCount(repo.openIssues)} issues</span>
                </div>

                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--green os-card-cta"
                >
                  <span>// OPEN REPO</span>
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
