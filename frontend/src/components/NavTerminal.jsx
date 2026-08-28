import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { navRoutes } from "../config/navRoutes";
import { listingsApi, newsApi } from "../services/apiClient";
import "./NavTerminal.css";

const PROMPT = "guest@techpulse:~$";
const CLI_SHORTCUTS = {
  admin: "/admin",
  "admin-console": "/admin",
  console: "/admin",
};

function resolveCdTarget(raw) {
  if (raw === undefined || raw === "") return "/";
  let arg = raw.trim();
  if (arg === "~" || arg === "/") return "/";
  arg = arg.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
  if (arg === "" || arg === "~") return "/";

  const asPath = "/" + arg;
  if (navRoutes.some((r) => r.path === asPath)) return asPath;

  if (Object.prototype.hasOwnProperty.call(CLI_SHORTCUTS, arg)) {
    return CLI_SHORTCUTS[arg];
  }

  for (const r of navRoutes) {
    if (r.aliases.some((a) => a === arg)) return r.path;
  }
  return null;
}

function labelForPath(pathname) {
  if (pathname === "/admin") return "ADMIN CONSOLE";
  const r = navRoutes.find((x) => x.path === pathname);
  return r ? r.label : pathname;
}

function formatLocalTime(d = new Date()) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function runLine(line, navigate, location, liveCounts) {
  const trimmed = line.trim();
  if (!trimmed) return { type: "skip" };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = trimmed.slice(parts[0].length).trim();

  if (cmd === "help" || cmd === "man") {
    return {
      type: "text",
      lines: [
        "Available commands:",
        "  cd <dir>     - change page (e.g. cd news, cd admin, cd /opportunities, cd ~)",
        "  ls, routes   - list pages and aliases",
        "  pwd          - show current route",
        "  clear        - clear output below",
        "",
        "OPS MODE:",
        "  status       - system status & counts",
        "  today        - what is happening right now",
        "  intel        - top signals (ticker + campus priority)",
        "  open <name>  - quick open (same as cd, e.g. open news)",
        "  help         - this message",
      ],
    };
  }

  if (cmd === "ls" || cmd === "routes") {
    const lines = ["Pages (use cd <name> or cd /path>):"];
    navRoutes.forEach((r) => {
      lines.push(`  ${r.path}  ${r.label}`);
      if (r.aliases.length)
        lines.push(`      aliases: ${r.aliases.join(", ")}`);
    });
    lines.push("  /admin  ADMIN CONSOLE");
    lines.push("      aliases: admin, admin-console, console");
    return { type: "text", lines };
  }

  if (cmd === "pwd") {
    return {
      type: "text",
      lines: [`${location.pathname}  (${labelForPath(location.pathname)})`],
    };
  }

  if (cmd === "status") {
    const techStories = liveCounts?.techStories ?? 0;
    const sources = liveCounts?.sources ?? "n/a";
    const campusPulse = liveCounts?.campusPulse ?? 0;
    const opportunities = liveCounts?.opportunities ?? 0;

    return {
      type: "text",
      ok: true,
      lines: [
        `STATUS @ ${formatLocalTime()}`,
        `route: ${location.pathname} (${labelForPath(location.pathname)})`,
        `signal: tech_stories=${techStories}  sources=${sources}  campus_pulse=${campusPulse}  opportunities=${opportunities}`,
        "system: - online",
      ],
    };
  }

  if (cmd === "today") {
    const lines = [`TODAY @ ${formatLocalTime()}`];
    lines.push("");
    lines.push(
      `Open opportunities available: ${liveCounts?.opportunities ?? 0}`,
    );
    lines.push("");
    lines.push("Tip: use `open opportunities` to view details.");
    return { type: "text", ok: true, lines };
  }

  if (cmd === "intel") {
    const tick = liveCounts?.tickerItems || [];
    const lines = [`INTEL @ ${formatLocalTime()}`, ""];
    lines.push("TICKER:");
    if (!tick.length) {
      lines.push("  (no live ticker data)");
    } else {
      tick.forEach((t) => lines.push(`  -> ${t}`));
    }
    lines.push("");
    const campus = liveCounts?.campusPulseItems || [];
    lines.push("CAMPUS (high priority):");
    if (!campus.length) {
      lines.push("  (no campus bulletins published yet)");
    } else {
      campus.forEach((title) => lines.push(`  -> ${title}`));
    }
    lines.push("");
    lines.push("Tip: `cd campus` for the full Campus Hub newsletter.");
    return { type: "text", ok: true, lines };
  }

  if (cmd === "clear") {
    return { type: "clear" };
  }

  if (cmd === "open") {
    const target = resolveCdTarget(rest);
    if (target === null) {
      return {
        type: "text",
        lines: [`open: no such page: ${rest || "(empty)"}`],
        error: true,
      };
    }
    if (target === location.pathname) {
      return { type: "text", lines: [`Already at ${target}`] };
    }
    navigate(target);
    return {
      type: "text",
      lines: [`-> ${target} (${labelForPath(target)})`],
      ok: true,
    };
  }

  if (cmd === "cd") {
    const target = resolveCdTarget(rest);
    if (target === null) {
      return {
        type: "text",
        lines: [`cd: no such page: ${rest || "(empty)"}`],
        error: true,
      };
    }
    if (target === location.pathname) {
      return { type: "text", lines: [`Already at ${target}`] };
    }
    navigate(target);
    return {
      type: "text",
      lines: [`-> ${target} (${labelForPath(target)})`],
      ok: true,
    };
  }

  return {
    type: "text",
    lines: [
      `command not found: ${parts[0]}`,
      "Type 'help' for available commands.",
    ],
    error: true,
  };
}

export default function NavTerminal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState("");
  const [liveCounts, setLiveCounts] = useState({
    techStories: 0,
    sources: 0,
    campusPulse: 0,
    opportunities: 0,
    tickerItems: [],
    campusPulseItems: [],
  });
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const outputEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function syncStatusCounts() {
      try {
        const [stories, sources, opportunitiesResp, campusPulseResp] =
          await Promise.all([
            newsApi.getStories(),
            newsApi.getSources(),
            listingsApi.getOpportunities().catch(() => []),
            newsApi.getCampusPulseStories({ limit: 20 }).catch(() => []),
          ]);

        if (cancelled) return;

        const campusPulseStories = Array.isArray(campusPulseResp)
          ? campusPulseResp
          : [];

        setLiveCounts({
          techStories: Array.isArray(stories) ? stories.length : 0,
          sources: Array.isArray(sources) ? sources.length : 0,
          campusPulse: campusPulseStories.length,
          opportunities: Array.isArray(opportunitiesResp)
            ? opportunitiesResp.length
            : 0,
          tickerItems: Array.isArray(stories)
            ? stories
                .slice(0, 5)
                .map((story) => story.title)
                .filter(Boolean)
            : [],
          campusPulseItems: campusPulseStories
            .slice(0, 5)
            .map((story) => story.title)
            .filter(Boolean),
        });
      } catch {
        // Keep fallback values if backend is unavailable.
      }
    }

    syncStatusCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollOutputToEnd = useCallback(() => {
    outputEndRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollOutputToEnd();
      const t = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open, lines, scrollOutputToEnd]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmdLine = input;
    setInput("");
    const result = runLine(cmdLine, navigate, location, liveCounts);

    setLines((prev) => {
      if (result.type === "skip") return prev;
      if (result.type === "clear") return [];
      const next = [...prev, { kind: "cmd", text: `${PROMPT} ${cmdLine}` }];
      if (result.type === "text") {
        const kind = result.error ? "err" : result.ok ? "ok" : "out";
        return [...next, ...result.lines.map((text) => ({ kind, text }))];
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      const toggle = e.target.closest?.(".nav-terminal-toggle");
      if (toggle) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-terminal-wrap" ref={panelRef}>
      <button
        type="button"
        className={`nav-terminal-toggle ${open ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nav-terminal-panel"
        title="Terminal navigation (secondary)"
      >
        <span className="nav-terminal-toggle-icon" aria-hidden>
          &gt;_
        </span>
        <span className="nav-terminal-toggle-label">CLI</span>
      </button>

      {open && (
        <div
          className="nav-terminal-panel"
          id="nav-terminal-panel"
          role="region"
          aria-label="Terminal navigation"
        >
          <div className="nav-terminal-hints" aria-hidden="false">
            <p className="nav-terminal-hint-title">
              // <code>cd</code> + Enter to navigate · <code>ls</code> ·{" "}
              <code>help</code> · <code>status</code> · <code>today</code> ·{" "}
              <code>intel</code>
            </p>
            <p className="nav-terminal-hint-compact">
              e.g. <code>cd ~</code> <code>cd news</code>{" "}
              <code>cd opportunities</code> <code>cd jobs</code>{" "}
              <code>cd clubs</code> <code>cd feed</code> <code>cd admin</code>
            </p>
          </div>
          <div className="nav-terminal-output" role="log" aria-live="polite">
            {lines.map((row, i) => (
              <div
                key={i}
                className={`nav-terminal-line nav-terminal-line--${row.kind}`}
              >
                {row.text}
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>
          <form className="nav-terminal-form" onSubmit={handleSubmit}>
            <span className="nav-terminal-prompt" aria-hidden>
              {PROMPT}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="nav-terminal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type `help` or `status`"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Terminal command"
            />
          </form>
        </div>
      )}
    </div>
  );
}
