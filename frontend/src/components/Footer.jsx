import './Footer.css';

const FOOTER_PID = '73219';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-terminal">
          <span className="footer-prompt">$</span>
          <span className="footer-cmd"> echo "Built by the TechPulse crew" | campus --deploy</span>
        </div>

        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-brand">
              <span className="brand-text">TECHPULSE</span>
              <span className="brand-separator">//</span>
              <span className="brand-sub">CAMPUS HUB</span>
            </div>
            <p className="footer-desc">
              Your one-stop terminal for everything tech on campus. 
              News, hackathons, opportunities, fests, and more.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">// NAVIGATE</h4>
            <ul className="footer-links">
              <li><a href="/news">Tech News</a></li>
              <li><a href="/hackathons">Hackathons</a></li>
              <li><a href="/opportunities">Opportunities</a></li>
              <li><a href="/admin">Admin Console</a></li>
              <li><a href="/clubs">Clubs</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">// CONNECT</h4>
            <ul className="footer-links">
              <li><a href="#">GitHub</a></li>
              <li><a href="#">X (Twitter)</a></li>
              <li><a href="#">Discord</a></li>
              <li><a href="#">Instagram</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">// SYSTEM</h4>
            <div className="footer-stats">
              <div className="stat-line">
                <span className="stat-key">uptime:</span>
                <span className="stat-val green">127 days</span>
              </div>
              <div className="stat-line">
                <span className="stat-key">version:</span>
                <span className="stat-val">v3.7.2</span>
              </div>
              <div className="stat-line">
                <span className="stat-key">status:</span>
                <span className="stat-val green">● operational</span>
              </div>
              <div className="stat-line">
                <span className="stat-key">latency:</span>
                <span className="stat-val">12ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© 2026 TechPulse. All systems nominal.</span>
          <span className="footer-pid">PID: {FOOTER_PID}</span>
        </div>
      </div>
    </footer>
  );
}
