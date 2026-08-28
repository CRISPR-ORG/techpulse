import { useCallback, useEffect, useState } from "react";
import AdminPublishForm from "../components/AdminPublishForm";
import { adminApi } from "../services/apiClient";
import "./Admin.css";

const ADMIN_TOKEN_KEY = "techpulse_admin_token";
const ADMIN_PROFILE_KEY = "techpulse_admin_profile";

const INITIAL_LOGIN = {
  username: "",
  password: "",
};

const INITIAL_PUBLISH_VALUES = {
  title: "",
  description: "",
  url: "",
  sourceName: "Campus Pulse Admin",
  imageUrl: "",
  mainImage: "",
  publishedAt: "",
};

function parseStoredAdminProfile() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_PROFILE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatPublishedTime(value) {
  const timestamp = new Date(value || "").getTime();
  if (Number.isNaN(timestamp)) return "recent";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function validatePublishForm(values) {
  const errors = {};
  const title = values.title.trim();
  const description = values.description.trim();
  const url = values.url.trim();
  const imageUrl = values.imageUrl.trim();
  const mainImage = values.mainImage.trim();
  const publishedAt = values.publishedAt.trim();

  if (!title) {
    errors.title = "Title is required.";
  }

  if (!description) {
    errors.description = "Description is required.";
  }

  if (!url) {
    errors.url = "Reference URL is required.";
  } else if (!/^https?:\/\//i.test(url)) {
    errors.url = "URL must start with http:// or https://.";
  }

  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    errors.imageUrl = "Image URL must start with http:// or https://.";
  }

  if (mainImage && !/^https?:\/\//i.test(mainImage)) {
    errors.mainImage = "Main Image URL must start with http:// or https://.";
  }

  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) {
    errors.publishedAt = "Publish timestamp is invalid.";
  }

  return errors;
}

export default function Admin() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  });
  const [adminProfile, setAdminProfile] = useState(() => parseStoredAdminProfile());
  const [isCheckingAuth, setIsCheckingAuth] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(ADMIN_TOKEN_KEY));
  });
  const [authError, setAuthError] = useState("");

  const [loginValues, setLoginValues] = useState(INITIAL_LOGIN);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [publishValues, setPublishValues] = useState(INITIAL_PUBLISH_VALUES);
  const [publishErrors, setPublishErrors] = useState({});
  const [publishStatus, setPublishStatus] = useState({
    tone: "",
    text: "",
  });
  const [isPublishing, setIsPublishing] = useState(false);

  const [publishedNews, setPublishedNews] = useState([]);
  const [isPublishedNewsLoading, setIsPublishedNewsLoading] = useState(false);
  const [publishedNewsError, setPublishedNewsError] = useState("");

  const clearAuthState = useCallback(() => {
    setToken("");
    setAdminProfile(null);
    setPublishedNews([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.localStorage.removeItem(ADMIN_PROFILE_KEY);
    }
  }, []);

  const loadPublishedNews = useCallback(async (activeToken) => {
    if (!activeToken) return;

    setIsPublishedNewsLoading(true);
    setPublishedNewsError("");

    try {
      const entries = await adminApi.getMyPublishedNews(activeToken, { limit: 40 });
      setPublishedNews(Array.isArray(entries) ? entries : []);
    } catch (error) {
      setPublishedNews([]);
      setPublishedNewsError(error.message || "Unable to load your published entries.");
    } finally {
      setIsPublishedNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    let cancelled = false;

    async function restoreAdminSession() {
      setIsCheckingAuth(true);
      setAuthError("");

      try {
        const profile = await adminApi.getMe(token);
        if (cancelled) return;

        setAdminProfile(profile);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
        }

        await loadPublishedNews(token);
      } catch (error) {
        if (cancelled) return;

        clearAuthState();
        setAuthError(error.message || "Admin session expired. Please login again.");
      } finally {
        if (!cancelled) {
          setIsCheckingAuth(false);
        }
      }
    }

    restoreAdminSession();

    return () => {
      cancelled = true;
    };
  }, [clearAuthState, loadPublishedNews, token]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    const username = loginValues.username.trim();
    const password = loginValues.password;

    if (!username || !password) {
      setAuthError("Username and password are required.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError("");

    try {
      const payload = await adminApi.login(username, password);
      if (!payload?.token || !payload?.admin) {
        throw new Error("Login response is missing token or admin details.");
      }

      setToken(payload.token);
      setAdminProfile(payload.admin);
      setLoginValues(INITIAL_LOGIN);
      setIsCheckingAuth(true);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
        window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(payload.admin));
      }
    } catch (error) {
      setAuthError(error.message || "Unable to login with provided credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAuthState();
    setPublishStatus({ tone: "", text: "" });
    setPublishErrors({});
    setPublishedNewsError("");
    setIsPublishedNewsLoading(false);
  };

  const handlePublishFieldChange = (name, value) => {
    setPublishValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (publishErrors[name]) {
      setPublishErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePublishSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validatePublishForm(publishValues);
    setPublishErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setPublishStatus({
        tone: "error",
        text: "Fix the highlighted fields before publishing.",
      });
      return;
    }

    const payload = {
      title: publishValues.title.trim(),
      description: publishValues.description.trim(),
      url: publishValues.url.trim(),
      sourceName: publishValues.sourceName.trim() || undefined,
      imageUrl: publishValues.imageUrl.trim() || undefined,
      mainImage: publishValues.mainImage.trim() || undefined,
      publishedAt: publishValues.publishedAt
        ? new Date(publishValues.publishedAt).toISOString()
        : undefined,
    };

    setIsPublishing(true);
    setPublishStatus({ tone: "", text: "" });

    try {
      await adminApi.publishNews(token, payload);
      setPublishStatus({
        tone: "success",
        text: "Campus Pulse entry published successfully.",
      });
      setPublishValues((prev) => ({
        ...prev,
        title: "",
        description: "",
        url: "",
        imageUrl: "",
        mainImage: "",
        publishedAt: "",
      }));
      await loadPublishedNews(token);
    } catch (error) {
      setPublishStatus({
        tone: "error",
        text: error.message || "Publish failed. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const isAuthenticated = Boolean(token && adminProfile?.id);

  return (
    <div className="page-enter page-content">
      <div className="container">
        <div className="page-header">
          <p className="section-label">08 //</p>
          <h1 className="section-title">
            admin <span className="highlight">publishing</span> console
          </h1>
          <p className="page-desc">
            Publish Campus Pulse updates for all users. Every post appears in
            the Campus Hub newsletter feed immediately after publishing.
          </p>
        </div>

        {isCheckingAuth ? (
          <div className="card admin-status-card">Restoring admin session...</div>
        ) : !isAuthenticated ? (
          <section className="card admin-auth-card" aria-labelledby="admin-login-title">
            <div className="admin-panel-head">
              <p className="admin-panel-label">// AUTH REQUIRED</p>
              <h2 id="admin-login-title" className="admin-panel-title">
                admin login
              </h2>
              <p className="admin-panel-subtitle">
                Restricted to Campus Pulse admins. Anything published here goes
                live in the Campus Hub feed.
              </p>
            </div>

            <form className="admin-login-form" onSubmit={handleLoginSubmit} noValidate>
              <label className="admin-field-label" htmlFor="admin-username">
                Username
              </label>
              <input
                id="admin-username"
                className="admin-input"
                type="text"
                value={loginValues.username}
                onChange={(event) =>
                  setLoginValues((prev) => ({ ...prev, username: event.target.value }))
                }
                placeholder="admin username"
                autoComplete="username"
              />

              <label className="admin-field-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                className="admin-input"
                type="password"
                value={loginValues.password}
                onChange={(event) =>
                  setLoginValues((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="••••••••"
                autoComplete="current-password"
              />

              {authError ? <p className="admin-banner admin-banner--error">{authError}</p> : null}

              <button type="submit" className="btn btn--green admin-login-btn" disabled={isLoggingIn}>
                <span>{isLoggingIn ? "Authenticating..." : "Login as Admin"}</span>
              </button>
            </form>
          </section>
        ) : (
          <div className="admin-layout">
            <section>
              <div className="card admin-session-card">
                <div className="admin-session-user">
                  <p className="admin-panel-label">// AUTH SESSION</p>
                  <h2 className="admin-panel-title">{adminProfile.username}</h2>
                  <p className="admin-panel-subtitle">
                    role: {adminProfile.role || "admin"}
                    {adminProfile.email ? `  •  ${adminProfile.email}` : ""}
                  </p>
                </div>

                <button type="button" className="btn btn--ghost" onClick={handleLogout}>
                  <span>Logout</span>
                </button>
              </div>

              <AdminPublishForm
                values={publishValues}
                errors={publishErrors}
                onFieldChange={handlePublishFieldChange}
                onSubmit={handlePublishSubmit}
                isSubmitting={isPublishing}
              />

              {publishStatus.text ? (
                <p
                  className={`admin-banner ${
                    publishStatus.tone === "success"
                      ? "admin-banner--success"
                      : "admin-banner--error"
                  }`}
                >
                  {publishStatus.text}
                </p>
              ) : null}
            </section>

            <section className="card admin-published-panel" aria-labelledby="published-news-title">
              <div className="admin-published-header">
                <div>
                  <p className="admin-panel-label">// MY PUBLISHED NEWS</p>
                  <h2 id="published-news-title" className="admin-panel-title">
                    recent entries
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => loadPublishedNews(token)}
                  disabled={isPublishedNewsLoading}
                >
                  <span>{isPublishedNewsLoading ? "Refreshing..." : "Refresh"}</span>
                </button>
              </div>

              {publishedNewsError ? (
                <p className="admin-banner admin-banner--error">{publishedNewsError}</p>
              ) : null}

              {isPublishedNewsLoading ? (
                <p className="admin-empty">Loading your published entries...</p>
              ) : publishedNews.length === 0 ? (
                <p className="admin-empty">No published entries yet. Your new posts will appear here.</p>
              ) : (
                <div className="admin-published-list">
                  {publishedNews.map((entry, index) => (
                    <article key={entry.id || `${entry.url}-${index}`} className="admin-published-item">
                      <div className="admin-published-top">
                        <span className="tag tag--green">PUBLISHED</span>
                        <span className="admin-published-time">
                          {formatPublishedTime(entry.published_at)}
                        </span>
                      </div>

                      <h3 className="admin-published-title">{entry.title || "Untitled"}</h3>
                      <p className="admin-published-desc">
                        {entry.description || "No description was provided for this item."}
                      </p>

                      {entry.image_url ? (
                        <img
                          className="admin-published-image"
                          src={entry.image_url}
                          alt={entry.title || "Published item image"}
                          loading="lazy"
                        />
                      ) : null}

                      <div className="admin-published-footer">
                        <span className="admin-published-source">
                          {entry.source_name || "Campus Pulse Admin"}
                        </span>
                        <a href={entry.url} target="_blank" rel="noreferrer" className="admin-published-link">
                          OPEN SOURCE
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
