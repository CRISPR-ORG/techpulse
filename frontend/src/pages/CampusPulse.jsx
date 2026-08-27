import { useEffect, useState } from 'react';
import Clubs from './Clubs';
import Feed from './Feed';
import Fests from './Fests';
import { newsApi } from '../services/apiClient';
import './CampusPulse.css';

function toRelativeTime(value) {
  if (!value) return 'recent';

  const now = Date.now();
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return 'recent';

  const diffMinutes = Math.max(1, Math.floor((now - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function toTimestamp(value) {
  const timestamp = new Date(value || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function derivePriority(value) {
  const hours = Math.floor((Date.now() - toTimestamp(value)) / 3600000);
  if (hours <= 12) return 'high';
  if (hours <= 48) return 'medium';
  return 'low';
}

async function hydrateCampusPulseStories(stories = []) {
  const entries = await Promise.all(
    (stories || []).map(async (story) => {
      let leadArticle = null;

      try {
        const storyArticles = await newsApi.getStoryArticles(story.id);
        if (Array.isArray(storyArticles) && storyArticles.length > 0) {
          leadArticle = storyArticles[0];
        }
      } catch {
        leadArticle = null;
      }

      const publishedAt = leadArticle?.published_at || story.created_at;

      return {
        id: leadArticle?.id ? `${story.id}-${leadArticle.id}` : String(story.id),
        type: 'ANNOUNCEMENT',
        title: leadArticle?.title || story.title || 'Campus pulse update',
        detail: leadArticle?.description || 'Open source link to read the full update.',
        source: leadArticle?.source_name || 'Campus Pulse Admin',
        url: leadArticle?.url || '#',
        image: leadArticle?.image_url || story.main_image || '',
        publishedAt,
        time: toRelativeTime(publishedAt),
        priority: derivePriority(publishedAt),
      };
    }),
  );

  return entries.sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt));
}

export function CampusPulseContent({ defaultTab = 'newsletter' } = {}) {
  const [tab, setTab] = useState(defaultTab);
  const [pulseItems, setPulseItems] = useState([]);
  const [isPulseLoading, setIsPulseLoading] = useState(true);
  const [pulseError, setPulseError] = useState('');

  useEffect(() => {
    if (tab !== 'newsletter') {
      return undefined;
    }

    let cancelled = false;

    async function loadCampusPulse() {
      setIsPulseLoading(true);
      setPulseError('');

      try {
        const stories = await newsApi.getCampusPulseStories({ limit: 24 });
        const hydrated = await hydrateCampusPulseStories(
          Array.isArray(stories) ? stories : [],
        );

        if (cancelled) return;
        setPulseItems(hydrated);
      } catch (error) {
        if (cancelled) return;
        setPulseItems([]);
        setPulseError(error.message || 'Unable to load campus pulse updates.');
      } finally {
        if (!cancelled) {
          setIsPulseLoading(false);
        }
      }
    }

    loadCampusPulse();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <>
      <div className="cp-toggle-row">
        <div className="cp-toggle" role="tablist" aria-label="Campus Pulse sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'newsletter'}
            className={`cp-toggle-btn ${tab === 'newsletter' ? 'active' : ''}`}
            onClick={() => setTab('newsletter')}
          >
            // NEWSLETTER
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'fests'}
            className={`cp-toggle-btn ${tab === 'fests' ? 'active' : ''}`}
            onClick={() => setTab('fests')}
          >
            // FESTS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'clubs'}
            className={`cp-toggle-btn ${tab === 'clubs' ? 'active' : ''}`}
            onClick={() => setTab('clubs')}
          >
            // CLUBS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'feed'}
            className={`cp-toggle-btn ${tab === 'feed' ? 'active' : ''}`}
            onClick={() => setTab('feed')}
          >
            // FEED
          </button>
        </div>

        <div className="cp-hint">
          <span className="pulse-dot" />
          <span className="cp-hint-text">newsletter, fests, clubs, and live campus chatter</span>
        </div>
      </div>

      {tab === 'newsletter' ? (
        <div className="cp-feed">
          {isPulseLoading ? (
            <div className="card cp-empty-state">Syncing campus bulletins from API...</div>
          ) : pulseError ? (
            <div className="card cp-empty-state">{pulseError}</div>
          ) : pulseItems.length === 0 ? (
            <div className="card cp-empty-state">No Campus Pulse entries published yet.</div>
          ) : (
            pulseItems.map((item) => (
              <div key={item.id} className="cp-item">
                <div className="cp-time">{item.time}</div>
                <div className="cp-content">
                  <div className="cp-header">
                    <span
                      className={`tag tag--${
                        item.priority === 'high'
                          ? 'red'
                          : item.priority === 'medium'
                            ? 'yellow'
                            : 'dim'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="tag tag--blue">PUBLISHED</span>
                  </div>
                  <h3 className="cp-title">{item.title}</h3>
                  <p className="cp-detail">{item.detail}</p>

                  {item.image ? (
                    item.url !== '#' ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="cp-image-link"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="cp-image"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="cp-image-link">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="cp-image"
                          loading="lazy"
                        />
                      </div>
                    )
                  ) : null}

                  <div className="cp-footer">
                    <span className="cp-source">{item.source}</span>
                    {item.url !== '#' ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="cp-open-link">
                        OPEN SOURCE
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'clubs' ? (
        <div className="cp-clubs">
          <Clubs embedded showHeader={false} />
        </div>
      ) : tab === 'feed' ? (
        <div className="cp-social-feed">
          <Feed embedded showHeader={false} />
        </div>
      ) : (
        <div className="cp-fests">
          <Fests embedded showHeader={false} />
        </div>
      )}
    </>
  );
}

export default function CampusPulse() {
  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">02 //</p>
          <h1 className="section-title">
            campus <span className="highlight">pulse</span> — monthly newsletter
          </h1>
          <p className="page-desc">
            College updates, recent events, notices, wins, and what’s next — curated so you don’t miss the real stuff happening on campus.
          </p>
        </div>

        <CampusPulseContent />
      </div>
    </div>
  );
}

