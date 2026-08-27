import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";
import MeshBackground from "./components/MeshBackground";
import Navbar from "./components/Navbar";
import Ticker from "./components/Ticker";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import News from "./pages/News";
import Opportunities from "./pages/Opportunities";
import Fests from "./pages/Fests";
import Clubs from "./pages/Clubs";
import Feed from "./pages/Feed";
import CampusPulse from "./pages/CampusPulse";
import OpenSource from "./pages/OpenSource";
import Admin from "./pages/Admin";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      window.scrollTo(0, 0);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

function AppContent() {
  return (
    <div className="app-content">
      <ScrollToTop />
      <Navbar />
      <Ticker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/campus-pulse" element={<CampusPulse />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/opensource" element={<OpenSource />} />
        <Route path="/fests" element={<Fests />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="app-shell">
      <MeshBackground />
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <Router>
        <AppContent />
      </Router>
    </div>
  );
}
