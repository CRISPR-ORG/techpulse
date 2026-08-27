import { useEffect, useState } from "react";
import { listingsApi } from "../services/apiClient";
import TerminalWindow from '../components/TerminalWindow';
import './Hackathons.css';

export default function Hackathons() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHackathons() {
      setLoading(true);
      setError("");

      try {
        const payload = await listingsApi.getHackathons();
        if (cancelled) return;

        const normalized = Array.isArray(payload)
          ? payload.map((hack) => ({
              ...hack,
              status: String(hack?.status || "UPCOMING").toUpperCase(),
              themes: Array.isArray(hack?.themes) ? hack.themes : [],
              winners: Array.isArray(hack?.winners) ? hack.winners : [],
            }))
          : [];

        setHackathons(normalized);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || "Failed to fetch hackathons");
        setHackathons([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHackathons();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">03 //</p>
          <h1 className="section-title">
            the <span className="highlight">hackathon</span> arena
          </h1>
          <p className="page-desc">
            48 hours. No rules. Ship or sink. Track live hackathons, upcoming events, and past glory.
          </p>
        </div>

        {loading && (
          <div className="card news-empty-state">Syncing live hackathons from API...</div>
        )}

        {!loading && error && (
          <div className="card news-empty-state">{error}</div>
        )}

        {!loading && !error && hackathons.length === 0 && (
          <div className="card news-empty-state">No hackathons available right now.</div>
        )}

        {!loading && !error && hackathons.map((hack, index) => (
          <div
            key={hack.id}
            className={`hackathon-card ${hack.status.toLowerCase()}`}
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            <div className="hack-header">
              <div className="hack-header-left">
                <span className="hack-id">HK_{String(index + 1).padStart(2, '0')}</span>
                <div className={`status status--${hack.status.toLowerCase()}`}>
                  {hack.status === 'LIVE' && <span className="pulse-dot pulse-dot--red" />}
                  {hack.status === 'UPCOMING' && <span className="pulse-dot" style={{ background: 'var(--yellow)', boxShadow: '0 0 8px var(--yellow)' }} />}
                  {hack.status}
                </div>
              </div>
              <span className="hack-date">{hack.date}</span>
            </div>

            <div className="hack-body">
              <div className="hack-info">
                <h2 className="hack-name">{hack.name}</h2>
                <p className="hack-tagline">{hack.tagline}</p>

                <div className="hack-meta">
                  <div className="hack-meta-item">
                    <span className="meta-label">Prize Pool</span>
                    <span className="meta-value green">{hack.prize}</span>
                  </div>
                  <div className="hack-meta-item">
                    <span className="meta-label">Team Size</span>
                    <span className="meta-value">{hack.teamSize}</span>
                  </div>
                  <div className="hack-meta-item">
                    <span className="meta-label">Participants</span>
                    <span className="meta-value">{hack.participants}</span>
                  </div>
                </div>

                <div className="hack-themes">
                  {hack.themes.map(theme => (
                    <span key={theme} className="tag tag--dim">{theme}</span>
                  ))}
                </div>

                {hack.registrationUrl && (
                  <a href={hack.registrationUrl} className="btn btn--green hack-register">
                    <span>// REGISTER NOW</span>
                  </a>
                )}
              </div>

              <div className="hack-side">
                {hack.status === 'LIVE' && hack.countdown && (
                  <div className="hack-countdown">
                    <span className="countdown-label">TIME REMAINING</span>
                    <div className="countdown-grid">
                      <div className="countdown-unit">
                        <span className="countdown-num">{String(hack.countdown.hours).padStart(2, '0')}</span>
                        <span className="countdown-tag">HRS</span>
                      </div>
                      <span className="countdown-sep">:</span>
                      <div className="countdown-unit">
                        <span className="countdown-num">{String(hack.countdown.minutes).padStart(2, '0')}</span>
                        <span className="countdown-tag">MIN</span>
                      </div>
                    </div>
                  </div>
                )}

                {hack.status === 'UPCOMING' && hack.countdown && (
                  <div className="hack-countdown">
                    <span className="countdown-label">STARTS IN</span>
                    <div className="countdown-grid">
                      <div className="countdown-unit">
                        <span className="countdown-num">{hack.countdown.days}</span>
                        <span className="countdown-tag">DAYS</span>
                      </div>
                    </div>
                  </div>
                )}

                {hack.status === 'ENDED' && hack.winners && (
                  <TerminalWindow title="results.log" className="hack-results-terminal">
                    {hack.winners.map((w, i) => (
                      <div key={i} className="terminal-line">
                        <span className="output green">{w.place}</span>
                        <span className="output"> {w.team}</span>
                        <br />
                        <span className="output dim">   └─ {w.project}</span>
                      </div>
                    ))}
                  </TerminalWindow>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
