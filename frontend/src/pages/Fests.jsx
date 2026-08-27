import { useState } from "react";
import "./Fests.css";

export default function Fests({ embedded = false, showHeader = true } = {}) {
  const [expandedFest, setExpandedFest] = useState(null);
  const fests = [];

  const content = (
    <div className="container">
      {showHeader && (
        <div className="page-header">
          <p className="section-label">05 //</p>
          <h1 className="section-title">
            fest <span className="highlight">chronicles</span> — winners & glory
          </h1>
          <p className="page-desc">
            The gauntlet. Four fests. One campus. Infinite memories. Check
            results, winners, and upcoming events.
          </p>
        </div>
      )}

      <div className="fests-grid">
        {fests.length === 0 ? (
          <div className="fest-card">
            <h2 className="fest-name">No live fest data available</h2>
            <p className="fest-description">
              Fest data endpoint is not connected yet. This section will
              populate automatically when live data is available.
            </p>
          </div>
        ) : (
          fests.map((fest, index) => (
            <div
              key={fest.id}
              className={`fest-card ${expandedFest === fest.id ? "expanded" : ""}`}
              style={{ animationDelay: `${index * 0.15}s` }}
              onClick={() =>
                setExpandedFest(expandedFest === fest.id ? null : fest.id)
              }
            >
              <div className="fest-card-top">
                <div className="fest-card-header">
                  <span className="fest-type-tag">{fest.type}</span>
                  <span
                    className={`tag tag--${fest.status === "UPCOMING" ? "green" : "dim"}`}
                  >
                    {fest.status}
                  </span>
                </div>

                <h2 className="fest-name">{fest.name}</h2>
                <p className="fest-tagline">{fest.tagline}</p>
                <p className="fest-date">{fest.date}</p>
                <p className="fest-description">{fest.description}</p>

                {fest.highlight && (
                  <div className="fest-highlight">
                    <span className="highlight-icon">★</span>
                    {fest.highlight}
                  </div>
                )}
              </div>

              <div className="fest-events">
                <h3 className="fest-events-title">// EVENT RESULTS</h3>
                <div className="fest-events-list">
                  {fest.events.map((event, i) => (
                    <div key={i} className="fest-event-row">
                      <div className="fest-event-info">
                        <span className="fest-event-name">{event.name}</span>
                        <span className="fest-event-winner">
                          {event.winner === "TBD" ? (
                            <span className="tbd">TBD</span>
                          ) : (
                            <>🏆 {event.winner}</>
                          )}
                        </span>
                        <span className="fest-event-college">
                          {event.college}
                        </span>
                      </div>
                      <span className="fest-event-prize">{event.prize}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fest-expand-hint">
                {expandedFest === fest.id ? "▲ COLLAPSE" : "▼ VIEW RESULTS"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return <div className="page-enter page-content">{content}</div>;
}
