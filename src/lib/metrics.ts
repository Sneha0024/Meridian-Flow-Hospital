import type { Patient, Room, Snapshot, Unit } from "../domain/types";
import { UNITS } from "../domain/types";
import { waitMinutes } from "./format";

export interface UnitLoad {
  unit: Unit;
  occupied: number;
  cleaning: number;
  blocked: number;
  available: number;
  total: number;
}

export interface Metrics {
  active: number;
  waiting: number;
  longestWait: number;
  boarding: Patient[];
  dischargeReady: Patient[];
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  staffedBeds: number;
  occupancyPct: number;
  onDuty: number;
  clinicianCount: number;
  breaches: Patient[];
  units: UnitLoad[];
}

export function isBoarding(patient: Patient, rooms: Room[]): boolean {
  if (patient.status !== "admitted") return false;
  if (!patient.roomId) return true;
  const room = rooms.find((item) => item.id === patient.roomId);
  return !room || room.unit === "ED";
}

export function clinicianLoad(snapshot: Snapshot, clinicianId: string): number {
  return snapshot.patients.filter(
    (patient) => patient.clinicianId === clinicianId && patient.status !== "discharged",
  ).length;
}

export function buildMetrics(snapshot: Snapshot, now: number): Metrics {
  const { patients, rooms, clinicians } = snapshot;
  const queue = patients.filter((patient) => patient.status === "waiting" || patient.status === "triage");
  const waiting = patients.filter((patient) => patient.status === "waiting");
  const longestWait = waiting.reduce((max, patient) => Math.max(max, waitMinutes(patient.arrivalAt, now)), 0);

  const breaches = queue
    .filter((patient) => patient.acuity <= 2 && waitMinutes(patient.arrivalAt, now) >= 30)
    .slice()
    .sort((a, b) => waitMinutes(b.arrivalAt, now) - waitMinutes(a.arrivalAt, now));

  const dischargeReady = patients
    .filter((patient) => patient.status === "discharge-ready")
    .slice()
    .sort((a, b) => Date.parse(a.stageAt) - Date.parse(b.stageAt));

  const boarding = patients.filter((patient) => isBoarding(patient, rooms));

  const occupied = rooms.filter((room) => room.status === "occupied").length;
  const available = rooms.filter((room) => room.status === "available").length;
  const cleaning = rooms.filter((room) => room.status === "cleaning").length;
  const blocked = rooms.filter((room) => room.status === "blocked").length;
  const staffedBeds = rooms.length - blocked;
  const occupancyPct = staffedBeds === 0 ? 0 : Math.round((occupied / staffedBeds) * 100);

  const units = UNITS.map((unit) => {
    const list = rooms.filter((room) => room.unit === unit);
    return {
      unit,
      occupied: list.filter((room) => room.status === "occupied").length,
      cleaning: list.filter((room) => room.status === "cleaning").length,
      blocked: list.filter((room) => room.status === "blocked").length,
      available: list.filter((room) => room.status === "available").length,
      total: list.length,
    };
  }).filter((unit) => unit.total > 0);

  return {
    active: patients.filter((patient) => patient.status !== "discharged").length,
    waiting: waiting.length,
    longestWait,
    boarding,
    dischargeReady,
    occupied,
    available,
    cleaning,
    blocked,
    staffedBeds,
    occupancyPct,
    onDuty: clinicians.filter((clinician) => clinician.status === "available").length,
    clinicianCount: clinicians.length,
    breaches,
    units,
  };
}

function countWord(count: number): string {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  return count < words.length ? words[count] : String(count);
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function boardNarrative(metrics: Metrics): string {
  if (metrics.active === 0) {
    return "The house is empty. Open beds are ready for the next arrival.";
  }

  const discharge =
    metrics.dischargeReady.length === 0
      ? "No one is holding a bed for discharge."
      : metrics.dischargeReady.length === 1
        ? "One patient is ready to leave and still holding a bed."
        : `${sentence(countWord(metrics.dischargeReady.length))} patients are ready to leave and still holding beds.`;

  const waits =
    metrics.breaches.length === 0
      ? "High-acuity waits are inside the 30-minute target."
      : metrics.breaches.length === 1
        ? "One ESI-1 or ESI-2 patient has been waiting past the 30-minute target."
        : `${sentence(countWord(metrics.breaches.length))} ESI-1 or ESI-2 patients have been waiting past the 30-minute target.`;

  const boarding =
    metrics.boarding.length === 0
      ? ""
      : metrics.boarding.length === 1
        ? " One admission is still boarding in the ED."
        : ` ${sentence(countWord(metrics.boarding.length))} admissions are still boarding in the ED.`;

  return `${discharge} ${waits}${boarding}`;
}
