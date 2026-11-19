import { CLINICIAN_STATUS_LABEL, type FlowState, type Patient, type Room, type Snapshot } from "../domain/types";
import { advanceDetail, nextStatus, treatmentGate } from "../domain/rules";
import { doctorShort, uid } from "../lib/format";

export type FlowAction =
  | { type: "hydrate"; snapshot: Snapshot }
  | { type: "load-start" }
  | { type: "load-error"; message: string }
  | { type: "dismiss-notice"; id: string }
  | { type: "advance"; patientId: string; at: string; actor: string }
  | { type: "assign-clinician"; patientId: string; clinicianId: string | null; at: string; actor: string }
  | { type: "assign-room"; patientId: string; roomId: string | null; at: string; actor: string }
  | { type: "set-clinician-status"; clinicianId: string; status: FlowState["clinicians"][number]["status"] }
  | { type: "mark-room-clean"; roomId: string }
  | { type: "arrive"; patient: Patient };

function pushNotice(state: FlowState, tone: "ok" | "warn", text: string): FlowState {
  return {
    ...state,
    notices: [...state.notices, { id: uid(), tone, text }].slice(-3),
  };
}

function stamp(at: string, label: string, detail: string) {
  return { id: uid(), at, label, detail };
}

function replacePatient(state: FlowState, patientId: string, next: Patient): FlowState {
  return {
    ...state,
    patients: state.patients.map((patient) => (patient.id === patientId ? next : patient)),
  };
}

function releaseRoom(rooms: Room[], roomId: string | null): Room[] {
  if (!roomId) return rooms;
  return rooms.map((room) => (room.id === roomId ? { ...room, status: "cleaning" } : room));
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "hydrate":
      return {
        patients: action.snapshot.patients,
        clinicians: action.snapshot.clinicians,
        rooms: action.snapshot.rooms,
        load: "ready",
        error: null,
        notices: [],
      };
    case "load-start":
      return { ...state, load: "loading", error: null };
    case "load-error":
      return { ...state, load: "error", error: action.message };
    case "dismiss-notice":
      return { ...state, notices: state.notices.filter((notice) => notice.id !== action.id) };
    case "arrive": {
      if (state.patients.some((patient) => patient.id === action.patient.id)) {
        return pushNotice(state, "warn", "That arrival is already on the board.");
      }
      return pushNotice(
        { ...state, patients: [action.patient, ...state.patients] },
        "ok",
        `${action.patient.name} is on the board as waiting.`,
      );
    }
    case "advance": {
      const patient = state.patients.find((item) => item.id === action.patientId);
      if (!patient) return pushNotice(state, "warn", "That chart is no longer on the board.");
      const gate = treatmentGate(patient);
      if (gate) return pushNotice(state, "warn", gate);
      const upcoming = nextStatus(patient.status);
      if (!upcoming) return pushNotice(state, "warn", "This visit is already closed.");

      if (upcoming === "discharged") {
        const previous = state.rooms.find((room) => room.id === patient.roomId);
        const rooms = releaseRoom(state.rooms, patient.roomId);
        const nextPatient: Patient = {
          ...patient,
          status: "discharged",
          roomId: null,
          stageAt: action.at,
          timeline: [stamp(action.at, "Discharged", advanceDetail("discharged", action.actor)), ...patient.timeline],
        };
        const roomBit = previous ? ` ${previous.name} is now being cleaned.` : "";
        return pushNotice(
          replacePatient({ ...state, rooms }, patient.id, nextPatient),
          "ok",
          `${patient.name} has been discharged.${roomBit}`,
        );
      }

      const nextPatient: Patient = {
        ...patient,
        status: upcoming,
        stageAt: action.at,
        timeline: [stamp(action.at, labelFor(upcoming), advanceDetail(upcoming, action.actor)), ...patient.timeline],
      };
      return pushNotice(replacePatient(state, patient.id, nextPatient), "ok", noticeFor(patient.name, upcoming));
    }
    case "assign-clinician": {
      const patient = state.patients.find((item) => item.id === action.patientId);
      if (!patient) return pushNotice(state, "warn", "That chart is no longer on the board.");
      if (patient.status === "discharged") return pushNotice(state, "warn", "This visit is closed.");
      if (action.clinicianId === patient.clinicianId) return state;

      if (action.clinicianId === null) {
        const nextPatient: Patient = {
          ...patient,
          clinicianId: null,
          timeline: [stamp(action.at, "Physician cleared", `${action.actor} cleared the physician.`), ...patient.timeline],
        };
        return pushNotice(replacePatient(state, patient.id, nextPatient), "ok", `${patient.name} is unassigned.`);
      }

      const clinician = state.clinicians.find((item) => item.id === action.clinicianId);
      if (!clinician) return pushNotice(state, "warn", "That physician is not on the board.");
      if (clinician.status === "on-break") {
        return pushNotice(state, "warn", `${doctorShort(clinician.name)} is on break and can't take a patient.`);
      }
      if (clinician.status === "off-shift") {
        return pushNotice(state, "warn", `${doctorShort(clinician.name)} is off shift.`);
      }

      const nextPatient: Patient = {
        ...patient,
        clinicianId: clinician.id,
        timeline: [
          stamp(action.at, "Physician assigned", `${action.actor} assigned ${doctorShort(clinician.name)}.`),
          ...patient.timeline,
        ],
      };
      return pushNotice(
        replacePatient(state, patient.id, nextPatient),
        "ok",
        `${doctorShort(clinician.name)} is now assigned to ${patient.name}.`,
      );
    }
    case "assign-room": {
      const patient = state.patients.find((item) => item.id === action.patientId);
      if (!patient) return pushNotice(state, "warn", "That chart is no longer on the board.");
      if (patient.status === "discharged") return pushNotice(state, "warn", "This visit is closed.");
      if (action.roomId === patient.roomId) return state;

      if (action.roomId === null) {
        const previous = state.rooms.find((room) => room.id === patient.roomId);
        const rooms = releaseRoom(state.rooms, patient.roomId);
        const nextPatient: Patient = {
          ...patient,
          roomId: null,
          timeline: [stamp(action.at, "Room cleared", `${action.actor} cleared the room assignment.`), ...patient.timeline],
        };
        const extra = previous ? ` ${previous.name} is now being cleaned.` : "";
        return pushNotice(
          replacePatient({ ...state, rooms }, patient.id, nextPatient),
          "ok",
          `${patient.name} is no longer in a room.${extra}`,
        );
      }

      const room = state.rooms.find((item) => item.id === action.roomId);
      if (!room) return pushNotice(state, "warn", "That room is not on the board.");
      if (room.status === "cleaning") return pushNotice(state, "warn", `${room.name} is being cleaned.`);
      if (room.status === "blocked") {
        return pushNotice(
          state,
          "warn",
          room.note ? `${room.name} is blocked: ${room.note}.` : `${room.name} is blocked.`,
        );
      }
      const holder = state.patients.find(
        (item) => item.roomId === room.id && item.id !== patient.id && item.status !== "discharged",
      );
      if (holder || room.status === "occupied") {
        return pushNotice(state, "warn", `${room.name} is already in use.`);
      }

      const rooms = state.rooms.map((item) => {
        if (item.id === patient.roomId) return { ...item, status: "cleaning" as const };
        if (item.id === room.id) return { ...item, status: "occupied" as const };
        return item;
      });
      const previous = state.rooms.find((item) => item.id === patient.roomId);
      const nextPatient: Patient = {
        ...patient,
        roomId: room.id,
        timeline: [stamp(action.at, "Room assigned", `${action.actor} assigned ${room.name}.`), ...patient.timeline],
      };
      const extra = previous ? ` ${previous.name} is now being cleaned.` : "";
      return pushNotice(
        replacePatient({ ...state, rooms }, patient.id, nextPatient),
        "ok",
        `${patient.name} is in ${room.name}.${extra}`,
      );
    }
    case "set-clinician-status": {
      const clinician = state.clinicians.find((item) => item.id === action.clinicianId);
      if (!clinician) return pushNotice(state, "warn", "That physician is not on the board.");
      if (clinician.status === action.status) return state;
      const load = state.patients.filter(
        (patient) => patient.clinicianId === clinician.id && patient.status !== "discharged",
      ).length;
      const clinicians = state.clinicians.map((item) =>
        item.id === clinician.id ? { ...item, status: action.status } : item,
      );
      const next = { ...state, clinicians };
      const label = CLINICIAN_STATUS_LABEL[action.status].toLowerCase();
      if (action.status !== "available" && load > 0) {
        const noun = load === 1 ? "patient" : "patients";
        return pushNotice(next, "warn", `${doctorShort(clinician.name)} is ${label} and still has ${load} ${noun}.`);
      }
      return pushNotice(next, "ok", `${doctorShort(clinician.name)} is ${label}.`);
    }
    case "mark-room-clean": {
      const room = state.rooms.find((item) => item.id === action.roomId);
      if (!room) return pushNotice(state, "warn", "That room is not on the board.");
      if (room.status !== "cleaning") return pushNotice(state, "warn", `${room.name} is not waiting on cleaning.`);
      const holder = state.patients.some(
        (patient) => patient.roomId === room.id && patient.status !== "discharged",
      );
      if (holder) return pushNotice(state, "warn", `${room.name} still has a patient.`);
      const rooms = state.rooms.map((item) => (item.id === room.id ? { ...item, status: "available" as const } : item));
      return pushNotice({ ...state, rooms }, "ok", `${room.name} is open.`);
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function labelFor(status: Patient["status"]): string {
  switch (status) {
    case "triage":
      return "Triage started";
    case "in-treatment":
      return "Treatment started";
    case "admitted":
      return "Admitted";
    case "discharge-ready":
      return "Discharge ready";
    case "discharged":
      return "Discharged";
    default:
      return "Updated";
  }
}

function noticeFor(name: string, status: Patient["status"]): string {
  switch (status) {
    case "triage":
      return `${name} is in triage.`;
    case "in-treatment":
      return `${name} is in treatment.`;
    case "admitted":
      return `${name} is admitted.`;
    case "discharge-ready":
      return `${name} is ready for discharge.`;
    default:
      return `${name} was updated.`;
  }
}
