import { STATUSES, type Patient, type PatientStatus } from "./types";

/** The visit moves one step at a time. Branches such as LWBS or transfer are left for a later version. */
export function nextStatus(status: PatientStatus): PatientStatus | null {
  const index = STATUSES.indexOf(status);
  if (index < 0 || index === STATUSES.length - 1) return null;
  return STATUSES[index + 1];
}

export function treatmentGate(patient: Patient): string | null {
  if (patient.status !== "triage") return null;
  const needsPhysician = !patient.clinicianId;
  const needsRoom = !patient.roomId;
  if (needsPhysician && needsRoom) {
    return "Assign a physician and an open room before starting treatment.";
  }
  if (needsPhysician) return "Assign a physician before starting treatment.";
  if (needsRoom) return "Assign an open room before starting treatment.";
  return null;
}

export function advanceHelp(status: PatientStatus): string | null {
  switch (status) {
    case "waiting":
      return "Moves this visit into triage. A room can wait until treatment starts.";
    case "triage":
      return "Treatment needs a physician and an open room.";
    case "in-treatment":
      return "Records the admission. The current room stays occupied.";
    case "admitted":
      return "Marks the bed as a discharge hold, without freeing it yet.";
    case "discharge-ready":
      return "Closes the visit and sends the room to cleaning.";
    default:
      return null;
  }
}

export function advanceDetail(status: PatientStatus, actor: string): string {
  switch (status) {
    case "triage":
      return `${actor} started triage.`;
    case "in-treatment":
      return `${actor} moved this patient into treatment.`;
    case "admitted":
      return `${actor} recorded the admission.`;
    case "discharge-ready":
      return `${actor} marked this patient ready for discharge.`;
    case "discharged":
      return `${actor} completed the discharge.`;
    default:
      return `${actor} updated the visit.`;
  }
}
