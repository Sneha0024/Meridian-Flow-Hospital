import type { Acuity, Patient, Sex, Unit } from "../domain/types";
import { uid } from "./format";

export interface ArrivalInput {
  name: string;
  age: number;
  sex: Sex;
  unit: Unit;
  acuity: Acuity;
  complaint: string;
}

export function createArrival(input: ArrivalInput, now: number): Patient {
  const at = new Date(now).toISOString();
  return {
    id: `p-${uid()}`,
    mrn: `MG-${String(100000 + Math.floor(Math.random() * 900000))}`,
    name: input.name.trim(),
    age: input.age,
    sex: input.sex,
    complaint: input.complaint.trim(),
    acuity: input.acuity,
    status: "waiting",
    unit: input.unit,
    arrivalAt: at,
    stageAt: at,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: null,
    timeline: [
      {
        id: uid(),
        at,
        label: "Arrived",
        detail: "Registered at the flow desk.",
      },
    ],
  };
}
