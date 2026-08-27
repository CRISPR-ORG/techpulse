import { useEffect, useMemo, useState } from "react";
import {
  buildStoryCards,
  newsApi,
  sortStoriesByClicks,
} from "../services/apiClient";
import TerminalWindow from "../components/TerminalWindow";
import { CampusPulseContent } from "./CampusPulse";
import "./News.css";

const NEWS_FILTERS = ["ALL", "AI", "NEWS"];
const STORIES_PAGE_SIZE = 20;

function inferTopic({ category, title, description }) {
  const haystack =
    `${category || ""} ${title || ""} ${description || ""}`.toLowerCase();

  if (
    /(^|\W)(ai|ml|llm|gpt|openai|artificial intelligence|machine learning|neural)(\W|$)/.test(
      haystack,
    )
  ) {
    return "AI";
  }

  return "NEWS";
}

export default function News() {
  const [techNews, setTechNews] = useState([]);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") return "tech";

    const saved = window.localStorage.getItem("techpulse_news_view");
    return saved === "campus" ? "campus" : "tech";
  });
  const [activeFilter, setActiveFilter] = useState(() => {
    if (typeof window === "undefined") return "ALL";

    const saved = window.localStorage.getItem("techpulse_news_filter");
    return NEWS_FILTERS.includes(saved) ? saved : "ALL";
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTechNews() {
      if (view !== "tech") return;

      setLoading(true);
      setError("");
      setOffset(0);

      try {
        const [stories, trendingStories, sources] = await Promise.all([
          newsApi.getStories({ limit: STORIES_PAGE_SIZE, offset: 0 }),
          newsApi.getTrendingStories().catch(() => []),
          newsApi.getSources().catch(() => []),
        ]);

        const rankedStories = sortStoriesByClicks(
          stories || [],
          trendingStories || [],
        );
        const trendingIds = new Set(
          (trendingStories || []).map((story) => story.id),
        );
        const cards = await buildStoryCards(rankedStories, trendingIds);
        const cardsWithTopic = cards.map((card) => ({
          ...card,
          topic: inferTopic(card),
        }));

        if (cancelled) return;

        setTechNews(cardsWithTopic);
        setHasMore((stories || []).length === STORIES_PAGE_SIZE);
        setOffset((stories || []).length);
        setSourcesCount(Array.isArray(sources) ? sources.length : 0);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || "Failed to fetch tech news");
        setTechNews([]);
        setHasMore(false);
        setOffset(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTechNews();

    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem("techpulse_news_view", view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem("techpulse_news_filter", activeFilter);
  }, [activeFilter]);

  const filteredNews = useMemo(() => {
    if (activeFilter === "ALL") return techNews;
    return techNews.filter((story) => story.topic === activeFilter);
  }, [activeFilter, techNews]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");

    try {
      const [stories, trendingStories] = await Promise.all([
        newsApi.getStories({ limit: STORIES_PAGE_SIZE, offset }),
        newsApi.getTrendingStories().catch(() => []),
      ]);

      const rankedStories = sortStoriesByClicks(
        stories || [],
        trendingStories || [],
      );
      const trendingIds = new Set(
        (trendingStories || []).map((story) => story.id),
      );
      const cards = await buildStoryCards(rankedStories, trendingIds);
      const cardsWithTopic = cards.map((card) => ({
        ...card,
        topic: inferTopic(card),
      }));

      setTechNews((prev) => {
        const merged = [...prev, ...cardsWithTopic];
        const deduped = merged.filter(
          (item, index, arr) =>
            arr.findIndex((x) => x.id === item.id) === index,
        );
        return deduped;
      });

      setHasMore((stories || []).length === STORIES_PAGE_SIZE);
      setOffset((prev) => prev + (stories || []).length);
    } catch (loadError) {
      setError(loadError.message || "Failed to load more stories");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">01 //</p>
          <h1 className="section-title">
            {view === "tech" ? (
              <>
                what's <span className="highlight">breaking</span> in tech
              </>
            ) : (
              <>
                campus <span className="highlight">pulse</span> - newsletter
              </>
            )}
          </h1>
          <p className="page-desc">
            {view === "tech"
              ? "Real-time feed from across the tech world. No algorithms, no bias - just signal."
              : "College updates, recent events, notices, and wins - curated monthly, delivered clean."}
          </p>
        </div>

        <div className="news-view-toggle">
          <div
            className="news-toggle"
            role="tablist"
            aria-label="News page view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "tech"}
              className={`news-toggle-btn ${view === "tech" ? "active" : ""}`}
              onClick={() => setView("tech")}
            >
              // TECH NEWS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "campus"}
              className={`news-toggle-btn ${view === "campus" ? "active" : ""}`}
              onClick={() => setView("campus")}
            >
              // CAMPUS PULSE
            </button>
          </div>
        </div>

        {view === "tech" ? (
          <>
            <TerminalWindow
              title="news-scraper@feed:~$"
              className="news-terminal"
            >
              <div className="terminal-line">
                <span className="prompt">
                  $ curl -s api.techpulse.dev/news | jq '.latest[:6]'
                </span>
              </div>
              <div className="terminal-line">
                <span className="output dim">Fetching latest articles...</span>
              </div>
              <div className="terminal-line">
                <span className="output green">
                  {loading
                    ? "SYNC in progress..."
                    : `OK ${techNews.length} stor${techNews.length === 1 ? "y" : "ies"} ready`}
                  {!loading && ` across ${sourcesCount || "multiple"} sources`}
                </span>
              </div>
              <div className="terminal-line">
                <span className="output dim">filter={activeFilter}</span>
              </div>
              <div className="terminal-line">
                <span className="prompt">$ </span>
                <span className="terminal-cursor" />
              </div>
            </TerminalWindow>

            <section
              className="news-filter-panel"
              aria-labelledby="news-filter-heading"
            >
              <div className="news-filter-header">
                <p id="news-filter-heading" className="news-filter-label">
                  // FILTER THE FEED
                </p>
                <span className="news-filter-count">
                  {loading ? "syncing..." : `${filteredNews.length} visible`}
                </span>
              </div>
              <div
                className="news-filter-list"
                role="toolbar"
                aria-label="Filter tech news by topic"
              >
                {NEWS_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`news-filter-btn ${activeFilter === filter ? "active" : ""}`}
                    aria-pressed={activeFilter === filter}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </section>

            {loading ? (
              <div className="card news-empty-state">
                Syncing live stories from API...
              </div>
            ) : error ? (
              <div className="card news-empty-state">{error}</div>
            ) : filteredNews.length > 0 ? (
              <div>
                <div className="news-grid">
                  {filteredNews.map((news, index) => (
                    <article
                      key={news.id}
                      className="card news-card-full"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="news-full-header">
                        <div className="news-full-tags">
                          <span
                            className={`tag tag--${news.tag === "BREAKING" || news.tag === "CRITICAL" ? "red" : news.tag === "TRENDING" ? "yellow" : "green"}`}
                          >
                            {news.tag}
                          </span>
                          <span className="tag tag--blue">{news.topic}</span>
                          <span className="tag tag--dim">{news.category}</span>
                        </div>
                        <span className="news-id">
                          NS_{String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h2 className="news-full-title">{news.title}</h2>
                      <p className="news-full-desc">{news.description}</p>
                      <div className="news-full-footer">
                        <div className="news-source-info">
                          <span className="news-source-name">
                            {news.source}
                          </span>
                          <span className="news-dot">|</span>
                          <span className="news-timestamp">{news.time}</span>
                        </div>
                        <a
                          href={news.url}
                          className="news-read-more"
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            newsApi.trackStoryClick(news.id);
                          }}
                        >
                          {"READ ->"}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>

                {activeFilter === "ALL" && hasMore ? (
                  <div
                    className="card news-empty-state"
                    style={{ marginTop: "1rem" }}
                  >
                    <button
                      type="button"
                      className="news-read-more"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {loadingMore ? "LOADING MORE..." : "LOAD MORE STORIES ->"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="card news-empty-state">
                {activeFilter === "ALL"
                  ? "No articles available right now."
                  : `No ${activeFilter.toLowerCase()} stories available right now.`}
              </div>
            )}
          </>
        ) : (
          <CampusPulseContent />
        )}
      </div>
    </div>
  );
}
