import "./Feed.css";

export default function Feed({ embedded = false, showHeader = true } = {}) {
  const content = (
    <div className="container">
      {showHeader && (
        <div className="page-header">
          <p className="section-label">07 //</p>
          <h1 className="section-title">
            the <span className="highlight">feed</span> — live from X
          </h1>
          <p className="page-desc">
            What campus tech Twitter is saying. Unfiltered. Real-time. No
            algorithmic nonsense.
          </p>
        </div>
      )}

      <div className="feed-layout">
        <div className="feed-main">
          <div className="tweet-card">
            <div className="tweet-content">
              No live feed endpoint configured yet. This section will show data
              when backend feed integration is added.
            </div>
          </div>
        </div>

        <aside className="feed-sidebar">
          <div className="feed-sidebar-card">
            <h3 className="sidebar-title">// TRENDING ON CAMPUS</h3>
            <ul className="trending-list">
              <li className="trending-item">
                <span className="trending-tag">#DevStorm2026</span>
                <span className="trending-count">2.4K posts</span>
              </li>
              <li className="trending-item">
                <span className="trending-tag">#ICPC2026</span>
                <span className="trending-count">1.1K posts</span>
              </li>
              <li className="trending-item">
                <span className="trending-tag">#CampusWiFi</span>
                <span className="trending-count">876 posts</span>
              </li>
              <li className="trending-item">
                <span className="trending-tag">#NexusFest</span>
                <span className="trending-count">654 posts</span>
              </li>
              <li className="trending-item">
                <span className="trending-tag">#RustLang</span>
                <span className="trending-count">432 posts</span>
              </li>
            </ul>
          </div>

          <div className="feed-sidebar-card">
            <h3 className="sidebar-title">// ACCOUNTS TO FOLLOW</h3>
            <ul className="follow-list">
              <li className="follow-item">
                <div className="follow-avatar">
                  <span>B</span>
                </div>
                <div className="follow-info">
                  <span className="follow-name">@byteclub_campus</span>
                  <span className="follow-type">Coding Club</span>
                </div>
              </li>
              <li className="follow-item">
                <div className="follow-avatar">
                  <span>C</span>
                </div>
                <div className="follow-info">
                  <span className="follow-name">@cybercell_sec</span>
                  <span className="follow-type">Security Club</span>
                </div>
              </li>
              <li className="follow-item">
                <div className="follow-avatar">
                  <span>A</span>
                </div>
                <div className="follow-info">
                  <span className="follow-name">@aiml_guild</span>
                  <span className="follow-type">AI/ML Club</span>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );

  if (embedded) return content;

  return <div className="page-enter page-content">{content}</div>;
}
