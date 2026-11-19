import { useLocation } from "react-router-dom";
import { rememberedCensus } from "../lib/census";
import { safeInternal } from "../lib/returnTo";

export function useReturnTo(): string {
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  if (typeof from === "string") {
    const safe = safeInternal(from);
    if (safe) return safe;
  }
  return rememberedCensus();
}
