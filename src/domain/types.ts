export const UNITS = [
  "ED",
  "ICU",
  "Med-Surg",
  "Cardiology",
  "Pediatrics",
  "Observation",
] as const;

export type Unit = (typeof UNITS)[number];

export const STATUSES = [
  "waiting",
  "triage",
  "in-treatment",
  "admitted",
  "discharge-ready",
  "discharged",
] as const;

export type PatientStatus = (typeof STATUSES)[number];

export type Acuity = 1 | 2 | 3 | 4 | 5;

export type Sex = "F" | "M" | "X";

export type RoomStatus = "available" | "occupied" | "cleaning" | "blocked";

export type ClinicianStatus = "available" | "on-break" | "off-shift";

export interface Vitals {
  hr: number;
  systolic: number;
  diastolic: number;
  temp: number;
  spo2: number;
  rr: number;
  takenAt: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  label: string;
  detail: string;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  sex: Sex;
  complaint: string;
  acuity: Acuity;
  status: PatientStatus;
  unit: Unit;
  arrivalAt: string;
  stageAt: string;
  clinicianId: string | null;
  roomId: string | null;
  destination: Unit | null;
  note: string | null;
  vitals: Vitals | null;
  timeline: TimelineEvent[];
}

export interface Clinician {
  id: string;
  name: string;
  specialty: string;
  unit: Unit;
  status: ClinicianStatus;
}

export interface Room {
  id: string;
  name: string;
  unit: Unit;
  kind: string;
  status: RoomStatus;
  note: string | null;
}

export interface Snapshot {
  patients: Patient[];
  clinicians: Clinician[];
  rooms: Room[];
}

export interface Notice {
  id: string;
  tone: "ok" | "warn";
  text: string;
}

export interface FlowState extends Snapshot {
  load: "loading" | "ready" | "error";
  error: string | null;
  notices: Notice[];
}

export const STATUS_LABEL: Record<PatientStatus, string> = {
  waiting: "Waiting",
  triage: "In triage",
  "in-treatment": "In treatment",
  admitted: "Admitted",
  "discharge-ready": "Discharge ready",
  discharged: "Discharged",
};

export const CLINICIAN_STATUS_LABEL: Record<ClinicianStatus, string> = {
  available: "On duty",
  "on-break": "On break",
  "off-shift": "Off shift",
};

export const SEX_LABEL: Record<Sex, string> = {
  F: "Female",
  M: "Male",
  X: "Another",
};

export const ADVANCE_LABEL: Record<Exclude<PatientStatus, "discharged">, string> = {
  waiting: "Begin triage",
  triage: "Start treatment",
  "in-treatment": "Mark admitted",
  admitted: "Ready for discharge",
  "discharge-ready": "Complete discharge",
};

export type StatusFilter = "active" | "all" | PatientStatus;

export interface CensusQuery {
  q: string;
  status: StatusFilter;
  unit: Unit | "all";
  acuity: "all" | "high" | Acuity;
  sort: "priority" | "wait" | "newest" | "name";
  group: "none" | "status" | "unit";
}
