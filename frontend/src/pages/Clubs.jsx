import "./Clubs.css";

export default function Clubs({ embedded = false, showHeader = true } = {}) {
  const content = (
    <div className="container">
      {showHeader && (
        <div className="page-header">
          <p className="section-label">06 //</p>
          <h1 className="section-title">
            club <span className="highlight">dispatch</span> — what's cooking
          </h1>
          <p className="page-desc">
            The engine room of campus tech. Clubs building, breaking, and
            shipping — every single week.
          </p>
        </div>
      )}

      <div className="clubs-grid">
        <div className="card club-card">
          <h2 className="club-name">No live club data available</h2>
          <p className="club-description">
            This section is ready but currently has no backend endpoint
            connected. It will display live club data once available.
          </p>
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return <div className="page-enter page-content">{content}</div>;
}
