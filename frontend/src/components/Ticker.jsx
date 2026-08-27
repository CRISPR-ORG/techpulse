import { useEffect, useMemo, useState } from "react";
import "./Ticker.css";
import { newsApi } from "../services/apiClient";

export default function Ticker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadTickerItems() {
      try {
        const stories = await newsApi.getStories();
        if (cancelled) return;

        const titles = Array.isArray(stories)
          ? stories
              .map((story) => story?.title)
              .filter(Boolean)
              .slice(0, 8)
          : [];

        setItems(titles);
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }
    }

    loadTickerItems();

    return () => {
      cancelled = true;
    };
  }, []);

  const repeatedItems = useMemo(() => {
    const safeItems = items.length ? items : ["No live ticker data"];
    return [...safeItems, ...safeItems, ...safeItems];
  }, [items]);

  return (
    <div className="ticker" id="ticker-bar">
      <div className="ticker-track">
        {repeatedItems.map((item, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-bullet">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
