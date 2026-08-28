import { useEffect, useState } from "react";
import { listingsApi } from "../services/apiClient";
import "./Opportunities.css";

const OPPORTUNITIES_PAGE_SIZE = 20;

function normalizeOpportunity(opp) {
  return {
    ...opp,
    type: String(opp?.type || "OTHER").toUpperCase(),
    mode: String(opp?.mode || "ON-SITE").toUpperCase(),
    tags: Array.isArray(opp?.tags) ? opp.tags : [],
    applyUrl: opp?.applyUrl || "#",
    source: opp?.source || "",
  };
}

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunities() {
      setLoading(true);
      setError("");

      try {
        const payload = await listingsApi.getOpportunities({
          limit: OPPORTUNITIES_PAGE_SIZE,
          offset: 0,
        });
        if (cancelled) return;

        const normalized = Array.isArray(payload)
          ? payload.map(normalizeOpportunity)
          : [];

        setOpportunities(normalized);
        setOffset(normalized.length);
        setHasMore(normalized.length === OPPORTUNITIES_PAGE_SIZE);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || "Failed to fetch opportunities");
        setOpportunities([]);
        setOffset(0);
        setHasMore(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");

    try {
      const payload = await listingsApi.getOpportunities({
        limit: OPPORTUNITIES_PAGE_SIZE,
        offset,
      });

      const normalized = Array.isArray(payload)
        ? payload.map(normalizeOpportunity)
        : [];

      setOpportunities((prev) => {
        const merged = [...prev, ...normalized];
        return merged.filter(
          (item, index, arr) =>
            arr.findIndex((x) => x.id === item.id) === index,
        );
      });
      setOffset((prev) => prev + normalized.length);
      setHasMore(normalized.length === OPPORTUNITIES_PAGE_SIZE);
    } catch (loadError) {
      setError(loadError.message || "Failed to load more opportunities");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">04 //</p>
          <h1 className="section-title">
            opportunities. <span className="highlight">grab them.</span>
          </h1>
          <p className="page-desc">
            Live tech roles pulled daily from Remotive, Jobicy, Arbeitnow,
            Himalayas and Remote OK - filtered down to engineering only.
          </p>
        </div>

        {loading && (
          <div className="card news-empty-state">
            Syncing live opportunities from API...
          </div>
        )}

        {!loading && error && (
          <div className="card news-empty-state">{error}</div>
        )}

        {!loading && !error && opportunities.length === 0 && (
          <div className="card news-empty-state">
            No opportunities available right now.
          </div>
        )}

        <section className="opp-section" id="opportunities-section">
          <div className="opp-header-row">
            <span className="opp-col-header">ID</span>
            <span className="opp-col-header">ROLE</span>
            <span className="opp-col-header">COMPANY</span>
            <span className="opp-col-header">COMPENSATION</span>
            <span className="opp-col-header">DEADLINE</span>
            <span className="opp-col-header">TYPE</span>
          </div>

          <div className="opp-list">
            {!loading &&
              !error &&
              opportunities.map((opp, index) => (
                <div
                  key={opp.id}
                  className="opp-row"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="opp-id">{opp.id}</span>
                  <div className="opp-role-info">
                    <h3 className="opp-role">{opp.role}</h3>
                    <div className="opp-tags">
                      {opp.tags.map((tag) => (
                        <span key={tag} className="opp-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="opp-company">
                    <span className="opp-company-name">{opp.company}</span>
                    <span className="opp-location">
                      {opp.location}
                      {opp.source ? ` · via ${opp.source}` : ""}
                    </span>
                  </div>
                  <span className="opp-stipend">{opp.stipend}</span>
                  <span className="opp-deadline">{opp.deadline}</span>
                  <div className="opp-type-col">
                    <span
                      className={`tag tag--${opp.type === "INTERNSHIP" ? "green" : opp.type === "FULL-TIME" ? "blue" : "purple"}`}
                    >
                      {opp.type}
                    </span>
                    <span
                      className={`tag tag--${opp.mode === "REMOTE" ? "yellow" : opp.mode === "HYBRID" ? "purple" : "dim"}`}
                    >
                      {opp.mode}
                    </span>
                  </div>
                  <a
                    href={opp.applyUrl}
                    className="opp-apply"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {"APPLY ->"}
                  </a>
                </div>
              ))}
          </div>

          {!loading && !error && opportunities.length > 0 && hasMore && (
            <div
              className="card news-empty-state"
              style={{ marginTop: "1rem" }}
            >
              <button
                type="button"
                className="opp-apply"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {loadingMore ? "LOADING MORE..." : "LOAD MORE JOBS ->"}
              </button>
            </div>
          )}

          <div className="opp-cards-mobile">
            {!loading &&
              !error &&
              opportunities.map((opp, index) => (
                <div
                  key={opp.id}
                  className="card opp-card-mobile"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="opp-card-header">
                    <span className="opp-id">{opp.id}</span>
                    <div className="opp-card-tags">
                      <span
                        className={`tag tag--${opp.type === "INTERNSHIP" ? "green" : opp.type === "FULL-TIME" ? "blue" : "purple"}`}
                      >
                        {opp.type}
                      </span>
                      <span
                        className={`tag tag--${opp.mode === "REMOTE" ? "yellow" : "dim"}`}
                      >
                        {opp.mode}
                      </span>
                    </div>
                  </div>
                  <h3 className="opp-card-role">{opp.role}</h3>
                  <p className="opp-card-company">
                    {opp.company} - {opp.location}
                    {opp.source ? ` · via ${opp.source}` : ""}
                  </p>
                  <div className="opp-card-meta">
                    <span className="opp-card-stipend">{opp.stipend}</span>
                    <span className="opp-card-deadline">
                      Due: {opp.deadline}
                    </span>
                  </div>
                  <div className="opp-card-skills">
                    {opp.tags.map((tag) => (
                      <span key={tag} className="opp-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a
                    href={opp.applyUrl}
                    className="btn btn--green opp-card-apply"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>// APPLY</span>
                  </a>
                </div>
              ))}

            {!loading && !error && opportunities.length > 0 && hasMore && (
              <div
                className="card news-empty-state"
                style={{ marginTop: "1rem" }}
              >
                <button
                  type="button"
                  className="btn btn--green opp-card-apply"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  <span>
                    {loadingMore ? "// LOADING..." : "// LOAD MORE JOBS"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
