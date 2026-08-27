import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import NavTerminal from "./NavTerminal";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMobileOpen(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="main-nav">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-text">TECHPULSE</span>
          <span className="brand-separator">//</span>
          <span className="brand-sub">CAMPUS HUB</span>
        </Link>

        <div className={`navbar-links ${mobileOpen ? "open" : ""}`}>
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            HOME
          </Link>
          <Link
            to="/news"
            className={`nav-link ${location.pathname === "/news" ? "active" : ""}`}
          >
            TECH NEWS
          </Link>

          <div className="nav-dropdown">
            <span
              className={`nav-link ${["/opportunities", "/opensource"].includes(location.pathname) ? "active" : ""}`}
            >
              OPPORTUNITIES ▾
            </span>
            <div className="dropdown-menu">
              <Link to="/opportunities" className="dropdown-item">
                Job Opportunities
              </Link>
              <Link to="/opensource" className="dropdown-item">
                Open Source
              </Link>
            </div>
          </div>
        </div>

        <NavTerminal />

        <div className="navbar-status">
          <span className="pulse-dot" />
          <span className="status-text">SYSTEM ONLINE</span>
        </div>

        <button
          className={`navbar-hamburger ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
