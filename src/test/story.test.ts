import { describe, expect, it } from "vitest";
import { createSnapshot } from "../data/seed";
import { boardNarrative, buildMetrics } from "../lib/metrics";

const now = Date.parse("2026-11-19T16:20:00.000Z");

describe("afternoon census story", () => {
  const snapshot = createSnapshot(now);
  const metrics = buildMetrics(snapshot, now);

  it("matches the bed board to the patients holding rooms", () => {
    expect(snapshot.patients).toHaveLength(23);
    expect(metrics.active).toBe(21);
    expect(metrics.occupied).toBe(15);
    expect(metrics.available).toBe(13);
    expect(metrics.cleaning).toBe(2);
    expect(metrics.blocked).toBe(1);
    expect(metrics.staffedBeds).toBe(30);
    expect(metrics.occupancyPct).toBe(50);
  });

  it("surfaces the two long high-acuity waits and the boarding patient", () => {
    expect(metrics.breaches.map((patient) => patient.name)).toEqual(["Elena Voss", "Marcus Hale"]);
    expect(metrics.boarding.map((patient) => patient.name)).toEqual(["Daniel Okoye"]);
    expect(metrics.dischargeReady.map((patient) => patient.name)).toEqual([
      "Robert Diaz",
      "Camille Brooks",
      "Samira Haddad",
    ]);
    expect(boardNarrative(metrics)).toMatch(/Three patients are ready to leave/i);
    expect(boardNarrative(metrics)).toMatch(/Two ESI-1 or ESI-2/i);
  });

  it("leaves Dr. Kim free and Dr. Webb off shift with a patient", () => {
    const load = (id: string) =>
      snapshot.patients.filter((patient) => patient.clinicianId === id && patient.status !== "discharged");
    expect(snapshot.clinicians.find((item) => item.id === "kim")?.status).toBe("available");
    expect(load("kim")).toHaveLength(0);
    expect(snapshot.clinicians.find((item) => item.id === "webb")?.status).toBe("off-shift");
    expect(load("webb").map((patient) => patient.name)).toEqual(["Walter Simmons"]);
  });
});
