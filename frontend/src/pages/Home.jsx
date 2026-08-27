import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TerminalWindow from "../components/TerminalWindow";
import { terminalLines } from "../data/mockData";
import {
  buildStoryCards,
  newsApi,
  sortStoriesByClicks,
} from "../services/apiClient";
import "./Home.css";

export default function Home() {
  const [previewNews, setPreviewNews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        const [stories, trendingStories] = await Promise.all([
          newsApi.getStories(),
          newsApi.getTrendingStories().catch(() => []),
        ]);

        const rankedStories = sortStoriesByClicks(stories || [], trendingStories || []);
        const trendingIds = new Set(
          (trendingStories || []).map((story) => story.id),
        );
        const cards = await buildStoryCards(rankedStories, trendingIds);

        if (!cancelled) {
          setPreviewNews(cards.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setPreviewNews([]);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-enter">
      {/* ── HERO ── */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <p className="hero-subtitle">
                ● CAMPUS // INTERNAL NETWORK // RESTRICTED ACCESS PORTAL
              </p>
              <h1 className="hero-title">
                <span className="text-outline">THE</span>{" "}
                <span className="text-outline-green">CAMPUS</span>
                <br />
                <span className="text-outline">TECH NERVE</span>
                <br />
                <span className="hero-title-solid">CENTER.</span>
              </h1>
              <p className="hero-desc">
                A real feed. Real infrastructure. Real updates.
                <br />
                No babysitting. No hand-holding.
                <br />
                Just raw access — and the freedom to explore
                <br />
                everything tech on campus.
              </p>
              <div className="hero-actions">
                <Link to="/news" className="btn btn--green">
                  <span>// EXPLORE FEED</span>
                </Link>
                <Link
                  to="/opportunities#opportunities-section"
                  className="btn btn--ghost"
                >
                  <span>// VIEW OPPORTUNITIES</span>
                </Link>
              </div>
            </div>

            <div className="hero-terminal">
              <TerminalWindow title="techpulse@node-01:~$">
                {terminalLines.map((line, i) => (
                  <div key={i} className="terminal-line">
                    {line.type === "command" && (
                      <span className="prompt">{line.prompt}</span>
                    )}
                    {line.type === "output" && (
                      <span className={`output ${line.color || ""}`}>
                        {line.text}
                      </span>
                    )}
                    {line.type === "blank" && <br />}
                  </div>
                ))}
                <div className="terminal-line">
                  <span className="prompt">$ </span>
                  <span className="terminal-cursor" />
                </div>
              </TerminalWindow>
            </div>
          </div>
        </div>

        {/* Background grid pattern */}
        <div className="hero-grid-bg" />
      </section>

      {/* ── WHAT WE ARE LOOKING FOR ── */}
      <section className="section looking-for" id="looking-for">
        <div className="container">
          <div className="looking-for-center">
            <span
              className="pulse-dot"
              style={{ marginBottom: "1.5rem", display: "block" }}
            />
            <p className="section-label">// WHAT WE ARE LOOKING FOR</p>
            <h2 className="looking-title">
              built for students who
              <br />
              <span className="highlight typing-word">ship.</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ── QUICK STATS ── */}
      <section className="section stats-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">342</span>
              <span className="stat-label">ACTIVE BUILDERS</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">6</span>
              <span className="stat-label">LIVE NEWS FEEDS</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">5</span>
              <span className="stat-label">CAMPUS CLUBS</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">4</span>
              <span className="stat-label">FESTS THIS YEAR</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">127</span>
              <span className="stat-label">DAYS UPTIME</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">∞</span>
              <span className="stat-label">OPPORTUNITIES</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LATEST NEWS PREVIEW ── */}
      <section className="section" id="news-preview">
        <div className="container">
          <p className="section-label">01 //</p>
          <h2 className="section-title">
            what's <span className="highlight">breaking</span> in tech
          </h2>
          <div className="grid-3">
            {previewNews.map((news) => (
              <div key={news.id} className="card news-card">
                <div className="news-card-header">
                  <span
                    className={`tag tag--${news.tag === "BREAKING" ? "red" : news.tag === "CRITICAL" ? "red" : "green"}`}
                  >
                    {news.tag}
                  </span>
                  <span className="news-category">{news.category}</span>
                </div>
                <h3 className="news-card-title">{news.title}</h3>
                <p className="news-card-desc">{news.description}</p>
                <div className="news-card-meta">
                  <span className="news-source">{news.source}</span>
                  <span className="news-time">{news.time}</span>
                </div>
              </div>
            ))}
            {previewNews.length === 0 && (
              <div className="card news-card">
                <h3 className="news-card-title">Syncing latest stories...</h3>
                <p className="news-card-desc">
                  Live feed will appear here once the API responds.
                </p>
              </div>
            )}
          </div>
          <div className="section-cta">
            <Link to="/news" className="btn btn--green">
              <span>// VIEW ALL NEWS →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW TECHPULSE WORKS ── */}
      <section className="section why-section" id="why">
        <div className="container">
          <p className="section-label">02 //</p>
          <h2 className="section-title">
            keep up. show up. <span className="highlight">level up.</span>
          </h2>

          <div className="grid-3">
            <div className="card skill-card">
              <span className="skill-number">SKILL.01</span>
              <h3 className="skill-title">One place for campus tech signal.</h3>
              <p className="skill-desc">
                Tech news, opportunities, clubs, and updates —
                organized so you don’t miss deadlines or rely on forwarded
                screenshots.
              </p>
            </div>
            <div className="card skill-card">
              <span className="skill-number">SKILL.02</span>
              <h3 className="skill-title">Browse fast. Decide faster.</h3>
              <p className="skill-desc">
                Clean pages, consistent tags, and a terminal-style UI that keeps
                the theme without hiding what matters.
              </p>
            </div>
            <div className="card skill-card">
              <span className="skill-number">SKILL.03</span>
              <h3 className="skill-title">
                Made for builders, not doomscrolling.
              </h3>
              <p className="skill-desc">
                No infinite feed tricks. Just the essentials to help you ship
                projects, join events, and stay in the loop.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
