import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildStoryCards,
  newsApi,
  sortCardsByNewest,
} from "../services/apiClient";
import { CampusPulseContent } from "./CampusPulse";
import "./News.css";

const NEWS_FILTERS = ["ALL", "AI", "NEWS"];
const STORIES_PAGE_SIZE = 30;

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
  const [totalStories, setTotalStories] = useState(0);
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
        const [stories, trendingStories, countResp] = await Promise.all([
          newsApi.getStories({
            limit: STORIES_PAGE_SIZE,
            offset: 0,
            includeLead: true,
          }),
          newsApi.getTrendingStories().catch(() => []),
          newsApi.getStoriesCount().catch(() => null),
        ]);

        const trendingIds = new Set(
          (trendingStories || []).map((story) => story.id),
        );
        const cards = await buildStoryCards(stories || [], trendingIds);
        const cardsWithTopic = sortCardsByNewest(cards).map((card) => ({
          ...card,
          topic: inferTopic(card),
        }));

        if (cancelled) return;

        setTechNews(cardsWithTopic);
        setHasMore((stories || []).length === STORIES_PAGE_SIZE);
        setOffset((stories || []).length);
        setTotalStories(
          Number.isFinite(countResp?.total) ? countResp.total : 0,
        );
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

  const handleLoadMore = useCallback(async function handleLoadMore() {
    if (loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    setError("");

    try {
      const [stories, trendingStories] = await Promise.all([
        newsApi.getStories({
          limit: STORIES_PAGE_SIZE,
          offset,
          includeLead: true,
        }),
        newsApi.getTrendingStories().catch(() => []),
      ]);

      const trendingIds = new Set(
        (trendingStories || []).map((story) => story.id),
      );
      const cards = await buildStoryCards(stories || [], trendingIds);
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
        return sortCardsByNewest(deduped);
      });

      setHasMore((stories || []).length === STORIES_PAGE_SIZE);
      setOffset((prev) => prev + (stories || []).length);
    } catch (loadError) {
      setError(loadError.message || "Failed to load more stories");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, offset]);

  // Infinite scroll: load the next page as the sentinel nears the viewport.
  // `rootMargin` starts the fetch before the reader reaches the end, so the
  // feed keeps flowing instead of stalling at each page boundary.
  const sentinelRef = useRef(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || view !== "tech") return undefined;
    if (!hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, loading, view]);

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
              TECH NEWS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "campus"}
              className={`news-toggle-btn ${view === "campus" ? "active" : ""}`}
              onClick={() => setView("campus")}
            >
              CAMPUS PULSE
            </button>
          </div>
        </div>

        {view === "tech" ? (
          <>
            <section
              className="news-filter-panel"
              aria-labelledby="news-filter-heading"
            >
              <div className="news-filter-header">
                <p id="news-filter-heading" className="news-filter-label">
                  FILTER FEED
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
                      </div>
                      <h2 className="news-full-title">
                        {news.url && news.url !== "#" ? (
                          <a
                            href={news.url}
                            target="_blank"
                            rel="noreferrer"
                            className="news-card-title-link"
                            onClick={() => {
                              newsApi.trackStoryClick(news.id);
                            }}
                          >
                            {news.title}
                          </a>
                        ) : (
                          news.title
                        )}
                      </h2>
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

                {hasMore ? (
                  <>
                    <div ref={sentinelRef} aria-hidden="true" />
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
                        {loadingMore
                          ? `LOADING MORE... (${techNews.length}${totalStories ? `/${totalStories}` : ""} scanned)`
                          : activeFilter === "ALL"
                            ? `LOAD MORE STORIES (${techNews.length}${totalStories ? `/${totalStories}` : ""}) ->`
                            : `LOAD MORE ${activeFilter} STORIES (${filteredNews.length} of ${techNews.length}${totalStories ? `/${totalStories}` : ""} scanned) ->`}
                      </button>
                    </div>
                  </>
                ) : techNews.length > 0 ? (
                  <div
                    className="card news-empty-state"
                    style={{ marginTop: "1rem" }}
                  >
                    {activeFilter === "ALL"
                      ? `End of feed - all ${techNews.length} tech stories loaded.`
                      : `End of feed - ${filteredNews.length} ${activeFilter} stories out of ${techNews.length} scanned.`}
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
