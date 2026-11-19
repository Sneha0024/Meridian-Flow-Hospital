import { describe, expect, it } from "vitest";
import type { Patient } from "../domain/types";
import { applyCensus, parseCensusQuery } from "../lib/census";
import { createArrival } from "../lib/arrival";
import { vitalFlags } from "../lib/format";

const now = Date.parse("2026-11-19T16:20:00.000Z");

function person(overrides: Partial<Patient>): Patient {
  return {
    id: overrides.id ?? "x",
    mrn: "MG-9",
    name: overrides.name ?? "Pat",
    age: 30,
    sex: "F",
    complaint: overrides.complaint ?? "Pain",
    acuity: overrides.acuity ?? 3,
    status: overrides.status ?? "waiting",
    unit: overrides.unit ?? "ED",
    arrivalAt: overrides.arrivalAt ?? new Date(now - 10 * 60_000).toISOString(),
    stageAt: overrides.arrivalAt ?? new Date(now - 10 * 60_000).toISOString(),
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: null,
    timeline: [],
  };
}

describe("census query", () => {
  const patients = [
    person({ id: "long-low", name: "Theo Marin", acuity: 5, arrivalAt: new Date(now - 100 * 60_000).toISOString() }),
    person({ id: "short-high", name: "Elena Voss", acuity: 2, arrivalAt: new Date(now - 12 * 60_000).toISOString(), complaint: "Chest pain" }),
    person({ id: "gone", name: "Grace Lin", status: "discharged", acuity: 4 }),
  ];

  it("hides discharged visits from the active board", () => {
    const visible = applyCensus(patients, parseCensusQuery(new URLSearchParams()), now);
    expect(visible.map((item) => item.id)).not.toContain("gone");
  });

  it("sorts priority by acuity before wait", () => {
    const visible = applyCensus(patients, parseCensusQuery(new URLSearchParams()), now);
    expect(visible.map((item) => item.id)).toEqual(["short-high", "long-low"]);
  });

  it("searches the complaint", () => {
    const visible = applyCensus(patients, parseCensusQuery(new URLSearchParams("q=chest")), now);
    expect(visible.map((item) => item.name)).toEqual(["Elena Voss"]);
  });

  it("keeps high acuity to ESI 1 and 2", () => {
    const visible = applyCensus(patients, parseCensusQuery(new URLSearchParams("acuity=high&status=all")), now);
    expect(visible.every((item) => item.acuity <= 2)).toBe(true);
  });
});

describe("arrival and vital flags", () => {
  it("registers a waiting patient with no bed and no physician", () => {
    const patient = createArrival(
      { name: "Nia Cole", age: 22, sex: "F", unit: "ED", acuity: 2, complaint: "Syncope" },
      now,
    );
    expect(patient.status).toBe("waiting");
    expect(patient.roomId).toBeNull();
    expect(patient.clinicianId).toBeNull();
    expect(patient.vitals).toBeNull();
    expect(patient.timeline[0]?.label).toBe("Arrived");
  });

  it("does not score pediatric vitals with adult ranges", () => {
    const flags = vitalFlags(
      { hr: 140, systolic: 90, diastolic: 50, temp: 39, spo2: 93, rr: 32, takenAt: new Date(now).toISOString() },
      5,
    );
    expect(flags).toEqual({});
  });
});
