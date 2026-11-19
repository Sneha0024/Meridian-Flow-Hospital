import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <svg className="empty-art" viewBox="0 0 120 80" aria-hidden="true">
        <rect x="8" y="16" width="104" height="56" rx="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M20 40h28M20 50h18M64 28h36M64 40h28M64 52h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}

export function ErrorState({
  title = "Census unavailable",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

export function LoadingBoard() {
  return (
    <div className="page loading-board" aria-busy="true">
      <p className="sr-only">Loading the census.</p>
      <div className="skel skel-title" />
      <div className="skel skel-lede" />
      <div className="metrics">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="skel skel-metric" />
        ))}
      </div>
      <div className="layout-split">
        <div className="skel skel-panel" />
        <div className="skel skel-panel short" />
      </div>
    </div>
  );
}
