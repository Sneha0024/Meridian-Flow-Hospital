import { describe, expect, it } from "vitest";
import type { Clinician, FlowState, Patient, Room } from "../domain/types";
import { createSnapshot } from "../data/seed";
import { flowReducer } from "../state/reducer";

const at = "2026-11-19T16:20:00.000Z";

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    mrn: "MG-1",
    name: "Test Patient",
    age: 40,
    sex: "F",
    complaint: "Pain",
    acuity: 3,
    status: "triage",
    unit: "ED",
    arrivalAt: at,
    stageAt: at,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: null,
    timeline: [],
    ...overrides,
  };
}

function room(overrides: Partial<Room> = {}): Room {
  return {
    id: "ed-01",
    name: "ED-01",
    unit: "ED",
    kind: "Bay",
    status: "available",
    note: null,
    ...overrides,
  };
}

function clinician(overrides: Partial<Clinician> = {}): Clinician {
  return {
    id: "kim",
    name: "Leah Kim",
    specialty: "Emergency medicine",
    unit: "ED",
    status: "available",
    ...overrides,
  };
}

function state(overrides: Partial<FlowState> = {}): FlowState {
  return {
    patients: [patient()],
    clinicians: [clinician(), clinician({ id: "berg", name: "Noah Berg", status: "on-break" })],
    rooms: [room(), room({ id: "ed-02", name: "ED-02", status: "occupied" })],
    load: "ready",
    error: null,
    notices: [],
    ...overrides,
  };
}

describe("flow reducer", () => {
  it("refuses treatment until a physician and a room are assigned", () => {
    const next = flowReducer(state(), {
      type: "advance",
      patientId: "p1",
      at,
      actor: "Alex Chen",
    });
    expect(next.patients[0]?.status).toBe("triage");
    expect(next.notices[0]?.tone).toBe("warn");
    expect(next.notices[0]?.text).toMatch(/physician and an open room/i);
  });

  it("starts treatment once both assignments exist", () => {
    const ready = state({
      patients: [patient({ clinicianId: "kim", roomId: "ed-01" })],
      rooms: [room({ status: "occupied" })],
    });
    const next = flowReducer(ready, { type: "advance", patientId: "p1", at, actor: "Alex Chen" });
    expect(next.patients[0]?.status).toBe("in-treatment");
    expect(next.notices[0]?.text).toMatch(/in treatment/i);
  });

  it("rejects an occupied room and a physician who is on break", () => {
    const blockedRoom = flowReducer(state(), {
      type: "assign-room",
      patientId: "p1",
      roomId: "ed-02",
      at,
      actor: "Alex Chen",
    });
    expect(blockedRoom.patients[0]?.roomId).toBeNull();
    expect(blockedRoom.notices[0]?.text).toMatch(/already in use/i);

    const blockedDoc = flowReducer(state(), {
      type: "assign-clinician",
      patientId: "p1",
      clinicianId: "berg",
      at,
      actor: "Alex Chen",
    });
    expect(blockedDoc.patients[0]?.clinicianId).toBeNull();
    expect(blockedDoc.notices[0]?.text).toMatch(/on break/i);
  });

  it("sends the previous room to cleaning when a patient moves", () => {
    const current = state({
      patients: [patient({ roomId: "ed-02", status: "in-treatment" })],
      rooms: [room({ status: "available" }), room({ id: "ed-02", name: "ED-02", status: "occupied" })],
    });
    const next = flowReducer(current, {
      type: "assign-room",
      patientId: "p1",
      roomId: "ed-01",
      at,
      actor: "Alex Chen",
    });
    expect(next.patients[0]?.roomId).toBe("ed-01");
    expect(next.rooms.find((item) => item.id === "ed-01")?.status).toBe("occupied");
    expect(next.rooms.find((item) => item.id === "ed-02")?.status).toBe("cleaning");
  });

  it("discharges a patient and frees the bed for cleaning", () => {
    const holding = state({
      patients: [patient({ status: "discharge-ready", roomId: "ed-01" })],
      rooms: [room({ status: "occupied" })],
    });
    const next = flowReducer(holding, { type: "advance", patientId: "p1", at, actor: "Alex Chen" });
    expect(next.patients[0]?.status).toBe("discharged");
    expect(next.patients[0]?.roomId).toBeNull();
    expect(next.rooms[0]?.status).toBe("cleaning");
  });

  it("reopens a room only from cleaning", () => {
    const dirty = state({ rooms: [room({ status: "cleaning" }), room({ id: "ed-02", name: "ED-02" })] });
    const opened = flowReducer(dirty, { type: "mark-room-clean", roomId: "ed-01" });
    expect(opened.rooms[0]?.status).toBe("available");

    const refused = flowReducer(state(), { type: "mark-room-clean", roomId: "ed-01" });
    expect(refused.rooms[0]?.status).toBe("available");
    expect(refused.notices[0]?.tone).toBe("warn");
  });

  it("walks Elena from the queue into an open resuscitation bay", () => {
    const board = flowReducer(
      {
        ...createSnapshot(Date.parse(at)),
        load: "ready",
        error: null,
        notices: [],
      },
      { type: "advance", patientId: "elena", at, actor: "Alex Chen" },
    );
    const withDoctor = flowReducer(board, {
      type: "assign-clinician",
      patientId: "elena",
      clinicianId: "kim",
      at,
      actor: "Alex Chen",
    });
    const withRoom = flowReducer(withDoctor, {
      type: "assign-room",
      patientId: "elena",
      roomId: "ed-01",
      at,
      actor: "Alex Chen",
    });
    const treated = flowReducer(withRoom, { type: "advance", patientId: "elena", at, actor: "Alex Chen" });
    const elena = treated.patients.find((item) => item.id === "elena");
    expect(elena?.status).toBe("in-treatment");
    expect(elena?.clinicianId).toBe("kim");
    expect(elena?.roomId).toBe("ed-01");
    expect(treated.rooms.find((item) => item.id === "ed-01")?.status).toBe("occupied");
  });
});
