import type { Acuity, Sex, Vitals } from "../domain/types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function waitMinutes(iso: string, now: number): number {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed)) return 0;
  return Math.max(0, Math.round(elapsed / 60_000));
}

export function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatShift(now: number): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

export function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function boardTitle(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 12) return "Morning board";
  if (hour < 17) return "Afternoon board";
  if (hour < 21) return "Evening board";
  return "Night board";
}

export function doctorShort(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? name;
  return `Dr. ${last}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function formatTemp(value: number): string {
  return `${value.toFixed(1)}°C`;
}

export function ageSex(age: number, sex: Sex): string {
  return `${age}${sex}`;
}

/** Adult display cues only. Pediatric normal ranges are different, and this board does not score them. */
export function vitalFlags(vitals: Vitals, age: number): Partial<Record<"hr" | "bp" | "temp" | "spo2" | "rr", string>> {
  if (age < 18) return {};
  const flags: Partial<Record<"hr" | "bp" | "temp" | "spo2" | "rr", string>> = {};
  if (vitals.hr > 110) flags.hr = "High";
  else if (vitals.hr < 50) flags.hr = "Low";
  if (vitals.systolic >= 160 || vitals.diastolic >= 100) flags.bp = "High";
  else if (vitals.systolic < 90) flags.bp = "Low";
  if (vitals.temp >= 38) flags.temp = "High";
  else if (vitals.temp < 36) flags.temp = "Low";
  if (vitals.spo2 < 94) flags.spo2 = "Low";
  if (vitals.rr > 22) flags.rr = "High";
  else if (vitals.rr < 10) flags.rr = "Low";
  return flags;
}

export function waitTarget(acuity: Acuity): number {
  if (acuity <= 2) return 30;
  if (acuity === 3) return 60;
  return 120;
}
