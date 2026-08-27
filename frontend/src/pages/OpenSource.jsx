import { useState, useEffect } from 'react';

export default function OpenSource() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchOpportunities() {
      try {
        const res = await fetch('http://localhost:3000/api/github-opportunities');

        if (res.status === 403) {
          if (!cancelled) {
            setError('Rate limit reached, try again in an hour');
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch opportunities from server');
        }

        const data = await res.json();
        if (!cancelled) {
          setItems(data.items || []);
          setTotalCount(data.total_count || 0);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchOpportunities();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header" style={{ marginBottom: '3rem' }}>
          <p className="section-label">05 //</p>
          <h1 className="section-title">
            open source. <span className="highlight">contribute.</span>
          </h1>
          <p className="page-desc">
            {loading ? 'Scanning GitHub for opportunities...' : `Currently ${totalCount.toLocaleString()} open issues matching "good first issue" in JS/TS.`}
          </p>
        </div>

        {loading ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pulse-dot"></span>
            <span>Fetching live opportunities from GitHub...</span>
          </div>
        ) : error ? (
          <div className="card">
            <h3 className="news-card-title" style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Error</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid-3">
            {items.map((item, index) => (
              <div key={item.id} className="card" style={{ animationDelay: `${index * 0.1}s`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="tag tag--blue">{item.repoName}</span>
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-heading)', flexGrow: 1 }}>
                  {item.title}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
                  {item.labels && item.labels.map(label => {
                    const colorHash = label.color ? `#${label.color}` : 'var(--text-secondary)';
                    return (
                      <span
                        key={label.id}
                        className="tag tag--dim"
                        style={{
                          color: colorHash,
                          borderColor: colorHash,
                          opacity: 0.8
                        }}
                      >
                        {label.name}
                      </span>
                    );
                  })}
                </div>

                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--green"
                  style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                >
                  <span>// VIEW ISSUE</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
