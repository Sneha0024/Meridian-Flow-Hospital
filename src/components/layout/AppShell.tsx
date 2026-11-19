import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CURRENT_USER } from "../../domain/session";
import { useFlow } from "../../state/context";
import { buildMetrics } from "../../lib/metrics";
import { formatShift } from "../../lib/format";
import { useNow } from "../../hooks/useNow";
import { ErrorState, LoadingBoard } from "../ui/States";

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="11" fill="#e7c98a" />
      <path
        d="M7 18.5h6.2l2.3-5.2 3.8 10.2 2.4-5H29"
        fill="none"
        stroke="#072c29"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Clock() {
  const now = useNow(1000);
  return <p className="shift">{formatShift(now)}</p>;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">(() =>
    document.documentElement.dataset.theme === "night" ? "night" : "day",
  );

  function toggle() {
    const next = theme === "day" ? "night" : "day";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("meridian-theme", next);
    } catch {
      // The theme still applies for this visit if storage is blocked.
    }
    setTheme(next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={theme === "night"}>
      Night board
    </button>
  );
}

export function AppShell() {
  const { state, dispatch, reload } = useFlow();
  const metrics = useMemo(() => (state.load === "ready" ? buildMetrics(state, Date.now()) : null), [state]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to the board
      </a>
      <div className="chrome">
        <header className="mast">
          <div className="topbar">
          <div className="brand">
            <Mark />
            <div className="brand-lockup">
              <span className="brand-kicker">Meridian General</span>
              <span className="brand-title">Flow Desk</span>
            </div>
          </div>
          <Clock />
          <div className="top-actions">
            <ThemeToggle />
            <div className="user">
              <span className="avatar" aria-hidden="true">
                {CURRENT_USER.initials}
              </span>
              <span>
                <span className="user-name">{CURRENT_USER.name}</span>
                <span className="user-role">
                  {CURRENT_USER.role} · {CURRENT_USER.unit}
                </span>
              </span>
            </div>
          </div>
          </div>
        </header>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end className="nav-link">
            Overview
          </NavLink>
          <NavLink to="/census" className="nav-link">
            Census
            {metrics && (
              <span className="nav-count">
                {metrics.active}
                <span className="sr-only"> patients</span>
              </span>
            )}
          </NavLink>
          <NavLink to="/rooms" className="nav-link">
            Rooms
            {metrics && (
              <span className="nav-count">
                {metrics.available} open
              </span>
            )}
          </NavLink>
          <NavLink to="/team" className="nav-link">
            Physicians
            {metrics && (
              <span className="nav-count">
                {metrics.onDuty}
                <span className="sr-only"> on duty</span>
              </span>
            )}
          </NavLink>
        </nav>
      </div>
      <main id="main" className="main">
        {state.load === "error" ? (
          <div className="page">
            <ErrorState message={state.error ?? "The census service didn't respond."} onRetry={reload} />
          </div>
        ) : state.load === "loading" ? (
          <LoadingBoard />
        ) : (
          <Outlet />
        )}
      </main>
      <footer className="footer">
        <div className="page">
          Meridian General is fictional. This board uses a simulated census and is not for clinical use.
        </div>
      </footer>
      <div className="notices" aria-live="polite" aria-relevant="additions">
        {state.notices.map((notice) => (
          <div key={notice.id} className={`notice ${notice.tone}`}>
            <p>{notice.text}</p>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => dispatch({ type: "dismiss-notice", id: notice.id })}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
