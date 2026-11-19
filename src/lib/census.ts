import {
  STATUSES,
  STATUS_LABEL,
  UNITS,
  type Acuity,
  type CensusQuery,
  type Patient,
  type Unit,
} from "../domain/types";
import { waitMinutes } from "./format";

const CENSUS_KEY = "meridian-census";

const STATUS_FILTERS = new Set<string>(["active", "all", ...STATUSES]);
const SORTS = new Set<CensusQuery["sort"]>(["priority", "wait", "newest", "name"]);
const GROUPS = new Set<CensusQuery["group"]>(["none", "status", "unit"]);

export function comparePriority(a: Patient, b: Patient, now: number): number {
  if (a.acuity !== b.acuity) return a.acuity - b.acuity;
  return waitMinutes(b.arrivalAt, now) - waitMinutes(a.arrivalAt, now);
}

function parseAcuity(value: string | null): CensusQuery["acuity"] {
  if (value === "high") return "high";
  if (value === "1" || value === "2" || value === "3" || value === "4" || value === "5") {
    return Number(value) as Acuity;
  }
  return "all";
}

function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value);
}

export function parseCensusQuery(params: URLSearchParams): CensusQuery {
  const statusValue = params.get("status") ?? "active";
  const sortValue = params.get("sort") ?? "priority";
  const groupValue = params.get("group") ?? "none";
  const unitValue = params.get("unit") ?? "all";

  return {
    q: params.get("q") ?? "",
    status: STATUS_FILTERS.has(statusValue) ? (statusValue as CensusQuery["status"]) : "active",
    unit: unitValue !== "all" && isUnit(unitValue) ? unitValue : "all",
    acuity: parseAcuity(params.get("acuity")),
    sort: SORTS.has(sortValue as CensusQuery["sort"]) ? (sortValue as CensusQuery["sort"]) : "priority",
    group: GROUPS.has(groupValue as CensusQuery["group"]) ? (groupValue as CensusQuery["group"]) : "none",
  };
}

export function censusParams(query: CensusQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q);
  if (query.status !== "active") params.set("status", query.status);
  if (query.unit !== "all") params.set("unit", query.unit);
  if (query.acuity !== "all") params.set("acuity", String(query.acuity));
  if (query.sort !== "priority") params.set("sort", query.sort);
  if (query.group !== "none") params.set("group", query.group);
  return params;
}

export function isDefaultQuery(query: CensusQuery): boolean {
  return (
    query.q.trim() === "" &&
    query.status === "active" &&
    query.unit === "all" &&
    query.acuity === "all" &&
    query.sort === "priority" &&
    query.group === "none"
  );
}

export function applyCensus(patients: Patient[], query: CensusQuery, now: number): Patient[] {
  const needle = query.q.trim().toLowerCase();
  const filtered = patients.filter((patient) => {
    if (query.status === "active" && patient.status === "discharged") return false;
    if (query.status !== "active" && query.status !== "all" && patient.status !== query.status) return false;
    if (query.unit !== "all" && patient.unit !== query.unit) return false;
    if (query.acuity === "high" && patient.acuity > 2) return false;
    if (typeof query.acuity === "number" && patient.acuity !== query.acuity) return false;
    if (!needle) return true;
    const haystack = `${patient.name} ${patient.mrn} ${patient.complaint}`.toLowerCase();
    return haystack.includes(needle);
  });

  return filtered.slice().sort((a, b) => {
    switch (query.sort) {
      case "wait":
        return waitMinutes(b.arrivalAt, now) - waitMinutes(a.arrivalAt, now);
      case "newest":
        return Date.parse(b.arrivalAt) - Date.parse(a.arrivalAt);
      case "name":
        return a.name.localeCompare(b.name);
      case "priority":
      default:
        return comparePriority(a, b, now);
    }
  });
}

export interface PatientGroup {
  key: string;
  label: string;
  patients: Patient[];
}

export function groupPatients(patients: Patient[], group: CensusQuery["group"]): PatientGroup[] {
  if (group === "none") return [{ key: "all", label: "All", patients }];
  if (group === "status") {
    return STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABEL[status],
      patients: patients.filter((patient) => patient.status === status),
    })).filter((entry) => entry.patients.length > 0);
  }
  return UNITS.map((unit) => ({
    key: unit,
    label: unit,
    patients: patients.filter((patient) => patient.unit === unit),
  })).filter((entry) => entry.patients.length > 0);
}

export function rememberCensus(search: string): void {
  const value = search.startsWith("?") ? search.slice(1) : search;
  try {
    sessionStorage.setItem(CENSUS_KEY, value);
  } catch {
    // Private mode can block storage. The back link then falls back to the census.
  }
}

export function rememberedCensus(): string {
  try {
    const value = sessionStorage.getItem(CENSUS_KEY);
    return value ? `/census?${value}` : "/census";
  } catch {
    return "/census";
  }
}
