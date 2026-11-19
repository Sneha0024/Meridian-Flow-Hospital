import type {
  Acuity,
  Clinician,
  Patient,
  PatientStatus,
  Room,
  RoomStatus,
  Sex,
  Snapshot,
  Unit,
  Vitals,
} from "../domain/types";

interface DraftEvent {
  min: number;
  label: string;
  detail: string;
}

interface DraftVitals {
  hr: number;
  systolic: number;
  diastolic: number;
  temp: number;
  spo2: number;
  rr: number;
  min: number;
}

interface Draft {
  id: string;
  mrn: string;
  name: string;
  age: number;
  sex: Sex;
  complaint: string;
  acuity: Acuity;
  status: PatientStatus;
  unit: Unit;
  arrivedMin: number;
  stageMin: number;
  clinicianId: string | null;
  roomId: string | null;
  destination: Unit | null;
  note: string | null;
  vitals: DraftVitals | null;
  events: DraftEvent[];
}

function ago(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

function visit(now: number, draft: Draft): Patient {
  const vitals: Vitals | null = draft.vitals
    ? {
        hr: draft.vitals.hr,
        systolic: draft.vitals.systolic,
        diastolic: draft.vitals.diastolic,
        temp: draft.vitals.temp,
        spo2: draft.vitals.spo2,
        rr: draft.vitals.rr,
        takenAt: ago(now, draft.vitals.min),
      }
    : null;

  return {
    id: draft.id,
    mrn: draft.mrn,
    name: draft.name,
    age: draft.age,
    sex: draft.sex,
    complaint: draft.complaint,
    acuity: draft.acuity,
    status: draft.status,
    unit: draft.unit,
    arrivalAt: ago(now, draft.arrivedMin),
    stageAt: ago(now, draft.stageMin),
    clinicianId: draft.clinicianId,
    roomId: draft.roomId,
    destination: draft.destination,
    note: draft.note,
    vitals,
    timeline: draft.events
      .slice()
      .sort((a, b) => a.min - b.min)
      .map((event) => ({
        id: `${draft.id}-${event.min}`,
        at: ago(now, event.min),
        label: event.label,
        detail: event.detail,
      })),
  };
}

function room(
  id: string,
  name: string,
  unit: Unit,
  kind: string,
  status: RoomStatus,
  note: string | null = null,
): Room {
  return { id, name, unit, kind, status, note };
}

const CLINICIANS: Clinician[] = [
  { id: "adeyemi", name: "Amira Adeyemi", specialty: "Critical care", unit: "ICU", status: "available" },
  { id: "singh", name: "Rohan Singh", specialty: "Emergency medicine", unit: "ED", status: "available" },
  { id: "okonkwo", name: "Chidi Okonkwo", specialty: "Pediatrics", unit: "Pediatrics", status: "available" },
  { id: "park", name: "Helen Park", specialty: "Hospital medicine", unit: "Med-Surg", status: "available" },
  { id: "alvarez", name: "Sofia Alvarez", specialty: "Cardiology", unit: "Cardiology", status: "available" },
  { id: "berg", name: "Noah Berg", specialty: "Emergency medicine", unit: "ED", status: "on-break" },
  { id: "kim", name: "Leah Kim", specialty: "Emergency medicine", unit: "ED", status: "available" },
  { id: "webb", name: "Marcus Webb", specialty: "Hospital medicine", unit: "Med-Surg", status: "off-shift" },
];

const ROOMS: Room[] = [
  room("ed-01", "ED-01", "ED", "Resuscitation", "available"),
  room("ed-02", "ED-02", "ED", "Bay", "occupied"),
  room("ed-03", "ED-03", "ED", "Bay", "available"),
  room("ed-04", "ED-04", "ED", "Bay", "cleaning"),
  room("ed-05", "ED-05", "ED", "Bay", "occupied"),
  room("ed-06", "ED-06", "ED", "Bay", "available"),
  room("ed-07", "ED-07", "ED", "Bay", "occupied"),
  room("ed-08", "ED-08", "ED", "Bay", "blocked", "Oxygen outlet repair"),
  room("ed-obs-1", "ED-OBS-1", "ED", "Observation", "occupied"),
  room("ed-obs-2", "ED-OBS-2", "ED", "Observation", "available"),
  room("icu-01", "ICU-01", "ICU", "ICU", "occupied"),
  room("icu-02", "ICU-02", "ICU", "ICU", "occupied"),
  room("icu-03", "ICU-03", "ICU", "ICU", "occupied"),
  room("icu-04", "ICU-04", "ICU", "ICU", "available"),
  room("ms-01", "MS-01", "Med-Surg", "Ward", "cleaning"),
  room("ms-02", "MS-02", "Med-Surg", "Ward", "occupied"),
  room("ms-03", "MS-03", "Med-Surg", "Ward", "available"),
  room("ms-04", "MS-04", "Med-Surg", "Ward", "occupied"),
  room("ms-05", "MS-05", "Med-Surg", "Ward", "available"),
  room("ms-06", "MS-06", "Med-Surg", "Ward", "occupied"),
  room("ms-07", "MS-07", "Med-Surg", "Ward", "available"),
  room("ms-08", "MS-08", "Med-Surg", "Ward", "occupied"),
  room("car-01", "CAR-01", "Cardiology", "Ward", "available"),
  room("car-02", "CAR-02", "Cardiology", "Ward", "occupied"),
  room("car-03", "CAR-03", "Cardiology", "Step-down", "available"),
  room("ped-01", "PED-01", "Pediatrics", "Ward", "occupied"),
  room("ped-02", "PED-02", "Pediatrics", "Ward", "occupied"),
  room("ped-03", "PED-03", "Pediatrics", "Ward", "available"),
  room("obs-01", "OBS-01", "Observation", "Observation", "available"),
  room("obs-02", "OBS-02", "Observation", "Observation", "occupied"),
  room("obs-03", "OBS-03", "Observation", "Observation", "available"),
];

const DRAFTS: Draft[] = [
  {
    id: "elena",
    mrn: "MG-48219",
    name: "Elena Voss",
    age: 67,
    sex: "F",
    complaint: "Chest pain radiating to the left arm",
    acuity: 2,
    status: "waiting",
    unit: "ED",
    arrivedMin: 52,
    stageMin: 52,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: "ECG ordered. Pain 7/10. Her daughter is at the bedside.",
    vitals: { hr: 118, systolic: 162, diastolic: 96, temp: 37, spo2: 96, rr: 20, min: 50 },
    events: [
      { min: 52, label: "Arrived", detail: "Walked in from the lobby with pressure-like chest pain." },
      { min: 50, label: "Pain score", detail: "Reports 7/10, radiating to the left arm." },
    ],
  },
  {
    id: "marcus",
    mrn: "MG-48220",
    name: "Marcus Hale",
    age: 54,
    sex: "M",
    complaint: "Shortness of breath",
    acuity: 2,
    status: "waiting",
    unit: "ED",
    arrivedMin: 36,
    stageMin: 36,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 116, systolic: 148, diastolic: 90, temp: 37.2, spo2: 91, rr: 26, min: 34 },
    events: [{ min: 36, label: "Arrived", detail: "Arrived by car, speaking in short sentences." }],
  },
  {
    id: "theo",
    mrn: "MG-48221",
    name: "Theo Marin",
    age: 19,
    sex: "M",
    complaint: "Twisted ankle after a fall",
    acuity: 5,
    status: "waiting",
    unit: "ED",
    arrivedMin: 14,
    stageMin: 14,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 78, systolic: 118, diastolic: 74, temp: 36.7, spo2: 99, rr: 16, min: 12 },
    events: [{ min: 14, label: "Arrived", detail: "Walk-in. Weight-bearing, with pain." }],
  },
  {
    id: "yara",
    mrn: "MG-48222",
    name: "Yara Mensah",
    age: 5,
    sex: "F",
    complaint: "Fever and poor intake",
    acuity: 3,
    status: "waiting",
    unit: "Pediatrics",
    arrivedMin: 22,
    stageMin: 22,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: "Her father says she has had fewer wet diapers since yesterday.",
    vitals: { hr: 132, systolic: 98, diastolic: 62, temp: 38.8, spo2: 98, rr: 28, min: 20 },
    events: [{ min: 22, label: "Arrived", detail: "Brought from clinic by her father." }],
  },
  {
    id: "aisha",
    mrn: "MG-48223",
    name: "Aisha Rahman",
    age: 29,
    sex: "F",
    complaint: "Lower abdominal pain",
    acuity: 3,
    status: "triage",
    unit: "ED",
    arrivedMin: 28,
    stageMin: 10,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 96, systolic: 128, diastolic: 78, temp: 37.4, spo2: 99, rr: 18, min: 10 },
    events: [
      { min: 28, label: "Arrived", detail: "Walk-in from the lobby." },
      { min: 10, label: "Triage started", detail: "Screen complete. A physician is not assigned yet." },
    ],
  },
  {
    id: "henry",
    mrn: "MG-48224",
    name: "Henry Walsh",
    age: 46,
    sex: "M",
    complaint: "Right flank pain",
    acuity: 3,
    status: "triage",
    unit: "ED",
    arrivedMin: 24,
    stageMin: 8,
    clinicianId: null,
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 88, systolic: 142, diastolic: 86, temp: 36.9, spo2: 98, rr: 18, min: 8 },
    events: [
      { min: 24, label: "Arrived", detail: "Walk-in." },
      { min: 8, label: "Triage started", detail: "Flank pain, no fever recorded at the screen." },
    ],
  },
  {
    id: "nora",
    mrn: "MG-48225",
    name: "Nora Blake",
    age: 33,
    sex: "F",
    complaint: "Forehead laceration",
    acuity: 4,
    status: "in-treatment",
    unit: "ED",
    arrivedMin: 80,
    stageMin: 30,
    clinicianId: "singh",
    roomId: "ed-02",
    destination: null,
    note: null,
    vitals: { hr: 82, systolic: 124, diastolic: 76, temp: 36.6, spo2: 99, rr: 16, min: 40 },
    events: [
      { min: 80, label: "Arrived", detail: "Walk-in after a fall at home." },
      { min: 55, label: "Triage started", detail: "Bleeding controlled with pressure." },
      { min: 30, label: "Treatment started", detail: "Moved to ED-02 for repair." },
    ],
  },
  {
    id: "imani",
    mrn: "MG-48226",
    name: "Imani Brooks",
    age: 24,
    sex: "F",
    complaint: "Allergic reaction with rash and lip swelling",
    acuity: 4,
    status: "in-treatment",
    unit: "ED",
    arrivedMin: 55,
    stageMin: 22,
    clinicianId: "singh",
    roomId: "ed-07",
    destination: null,
    note: "Epinephrine given on arrival. Airway is clear.",
    vitals: { hr: 104, systolic: 110, diastolic: 70, temp: 36.8, spo2: 97, rr: 20, min: 22 },
    events: [
      { min: 55, label: "Arrived", detail: "Arrived by car after a known allergen exposure." },
      { min: 40, label: "Triage started", detail: "Swelling to the lip, speaking in full sentences." },
      { min: 22, label: "Treatment started", detail: "Placed in ED-07 for observation after epinephrine." },
    ],
  },
  {
    id: "daniel",
    mrn: "MG-48227",
    name: "Daniel Okoye",
    age: 70,
    sex: "M",
    complaint: "Cellulitis of the lower leg",
    acuity: 3,
    status: "admitted",
    unit: "Med-Surg",
    arrivedMin: 360,
    stageMin: 90,
    clinicianId: "park",
    roomId: "ed-05",
    destination: "Med-Surg",
    note: "Admitted to Med-Surg. No ward bed yet, so he is boarding in the ED.",
    vitals: { hr: 94, systolic: 138, diastolic: 82, temp: 38.1, spo2: 96, rr: 18, min: 70 },
    events: [
      { min: 360, label: "Arrived", detail: "Referred from clinic with a spreading leg infection." },
      { min: 300, label: "Treatment started", detail: "Antibiotics started in ED-05." },
      { min: 90, label: "Admitted", detail: "Bed requested on Med-Surg. Still physically in the ED." },
    ],
  },
  {
    id: "samira",
    mrn: "MG-48228",
    name: "Samira Haddad",
    age: 44,
    sex: "F",
    complaint: "Migraine with photophobia",
    acuity: 4,
    status: "discharge-ready",
    unit: "ED",
    arrivedMin: 150,
    stageMin: 45,
    clinicianId: "berg",
    roomId: "ed-obs-1",
    destination: null,
    note: "The discharge summary is signed. Her ride is on the way.",
    vitals: { hr: 72, systolic: 122, diastolic: 76, temp: 36.6, spo2: 99, rr: 14, min: 50 },
    events: [
      { min: 150, label: "Arrived", detail: "Walk-in, symptoms since last night." },
      { min: 90, label: "Treatment started", detail: "Placed in ED-OBS-1." },
      { min: 45, label: "Discharge ready", detail: "Pain improved. Waiting on transport." },
    ],
  },
  {
    id: "owen",
    mrn: "MG-48229",
    name: "Owen Grant",
    age: 58,
    sex: "M",
    complaint: "Vomiting blood",
    acuity: 1,
    status: "in-treatment",
    unit: "ICU",
    arrivedMin: 95,
    stageMin: 40,
    clinicianId: "adeyemi",
    roomId: "icu-01",
    destination: null,
    note: "Two large-bore IVs are in. The blood bank has been called.",
    vitals: { hr: 124, systolic: 86, diastolic: 54, temp: 36.2, spo2: 93, rr: 26, min: 20 },
    events: [
      { min: 95, label: "Arrived", detail: "Arrived by ambulance, pale and vomiting blood." },
      { min: 70, label: "Triage started", detail: "ESI 1. Moved toward resuscitation." },
      { min: 40, label: "Treatment started", detail: "Accepted to ICU-01." },
    ],
  },
  {
    id: "ruth",
    mrn: "MG-48230",
    name: "Ruth Ellison",
    age: 79,
    sex: "F",
    complaint: "Sepsis, urinary source",
    acuity: 2,
    status: "admitted",
    unit: "ICU",
    arrivedMin: 430,
    stageMin: 200,
    clinicianId: "adeyemi",
    roomId: "icu-02",
    destination: null,
    note: null,
    vitals: { hr: 108, systolic: 98, diastolic: 58, temp: 38.6, spo2: 95, rr: 24, min: 40 },
    events: [
      { min: 430, label: "Arrived", detail: "From the emergency department after a hypotensive episode." },
      { min: 200, label: "Admitted", detail: "ICU bed accepted." },
    ],
  },
  {
    id: "paul",
    mrn: "MG-48231",
    name: "Paul Nguyen",
    age: 68,
    sex: "M",
    complaint: "Diabetic ketoacidosis",
    acuity: 2,
    status: "admitted",
    unit: "ICU",
    arrivedMin: 280,
    stageMin: 160,
    clinicianId: "adeyemi",
    roomId: "icu-03",
    destination: null,
    note: null,
    vitals: { hr: 110, systolic: 102, diastolic: 64, temp: 37.4, spo2: 97, rr: 20, min: 50 },
    events: [
      { min: 280, label: "Arrived", detail: "Transferred from the emergency department on an insulin infusion." },
      { min: 160, label: "Admitted", detail: "Placed in ICU-03." },
    ],
  },
  {
    id: "helen",
    mrn: "MG-48232",
    name: "Helen Cho",
    age: 81,
    sex: "F",
    complaint: "Hip fracture after a fall",
    acuity: 3,
    status: "admitted",
    unit: "Med-Surg",
    arrivedMin: 640,
    stageMin: 400,
    clinicianId: "park",
    roomId: "ms-02",
    destination: null,
    note: "Ortho has signed off. Physical therapy has not cleared her yet.",
    vitals: { hr: 84, systolic: 146, diastolic: 78, temp: 36.8, spo2: 97, rr: 16, min: 120 },
    events: [
      { min: 640, label: "Arrived", detail: "Admitted from the emergency department after imaging." },
      { min: 400, label: "Admitted", detail: "Settled in MS-02." },
    ],
  },
  {
    id: "robert",
    mrn: "MG-48233",
    name: "Robert Diaz",
    age: 72,
    sex: "M",
    complaint: "Pneumonia, finishing treatment",
    acuity: 3,
    status: "discharge-ready",
    unit: "Med-Surg",
    arrivedMin: 1400,
    stageMin: 110,
    clinicianId: "park",
    roomId: "ms-04",
    destination: null,
    note: "Prescriptions are filled. Transport home has not arrived.",
    vitals: { hr: 86, systolic: 132, diastolic: 74, temp: 37, spo2: 95, rr: 18, min: 90 },
    events: [
      { min: 1400, label: "Arrived", detail: "Admitted from the emergency department." },
      { min: 110, label: "Discharge ready", detail: "Oxygen weaned. Waiting on a ride." },
    ],
  },
  {
    id: "camille",
    mrn: "MG-48234",
    name: "Camille Brooks",
    age: 76,
    sex: "F",
    complaint: "Confusion from a treated urine infection",
    acuity: 3,
    status: "discharge-ready",
    unit: "Med-Surg",
    arrivedMin: 980,
    stageMin: 75,
    clinicianId: "park",
    roomId: "ms-06",
    destination: null,
    note: "Her daughter is coming from work to take her home.",
    vitals: { hr: 78, systolic: 136, diastolic: 72, temp: 36.7, spo2: 97, rr: 16, min: 80 },
    events: [
      { min: 980, label: "Arrived", detail: "Admitted after an overnight ED stay." },
      { min: 75, label: "Discharge ready", detail: "Back to baseline. Holding MS-06 until family arrives." },
    ],
  },
  {
    id: "walter",
    mrn: "MG-48235",
    name: "Walter Simmons",
    age: 84,
    sex: "M",
    complaint: "Heart failure exacerbation",
    acuity: 3,
    status: "admitted",
    unit: "Med-Surg",
    arrivedMin: 520,
    stageMin: 240,
    clinicianId: "webb",
    roomId: "ms-08",
    destination: null,
    note: "His physician is off shift. The chart still needs a covering hospitalist.",
    vitals: { hr: 92, systolic: 154, diastolic: 88, temp: 36.6, spo2: 94, rr: 20, min: 60 },
    events: [
      { min: 520, label: "Arrived", detail: "Admitted in the early morning." },
      { min: 240, label: "Admitted", detail: "Diuresis ongoing in MS-08." },
    ],
  },
  {
    id: "luis",
    mrn: "MG-48236",
    name: "Luis Ortega",
    age: 61,
    sex: "M",
    complaint: "Overnight observation after a stent",
    acuity: 2,
    status: "admitted",
    unit: "Cardiology",
    arrivedMin: 380,
    stageMin: 200,
    clinicianId: "alvarez",
    roomId: "car-02",
    destination: null,
    note: "Groin check is due this hour.",
    vitals: { hr: 68, systolic: 128, diastolic: 74, temp: 36.7, spo2: 98, rr: 14, min: 45 },
    events: [
      { min: 380, label: "Arrived", detail: "Came up from the cath lab." },
      { min: 200, label: "Admitted", detail: "Telemetry in CAR-02." },
    ],
  },
  {
    id: "jonah",
    mrn: "MG-48237",
    name: "Jonah Ellis",
    age: 8,
    sex: "M",
    complaint: "Asthma flare",
    acuity: 3,
    status: "in-treatment",
    unit: "Pediatrics",
    arrivedMin: 60,
    stageMin: 28,
    clinicianId: "okonkwo",
    roomId: "ped-01",
    destination: null,
    note: null,
    vitals: { hr: 118, systolic: 108, diastolic: 68, temp: 37, spo2: 94, rr: 28, min: 20 },
    events: [
      { min: 60, label: "Arrived", detail: "Brought by his mother, known asthma." },
      { min: 28, label: "Treatment started", detail: "Nebulizers started in PED-01." },
    ],
  },
  {
    id: "ben",
    mrn: "MG-48238",
    name: "Ben Carter",
    age: 3,
    sex: "M",
    complaint: "Croup",
    acuity: 4,
    status: "in-treatment",
    unit: "Pediatrics",
    arrivedMin: 42,
    stageMin: 16,
    clinicianId: "okonkwo",
    roomId: "ped-02",
    destination: null,
    note: null,
    vitals: { hr: 126, systolic: 100, diastolic: 64, temp: 37.8, spo2: 96, rr: 30, min: 16 },
    events: [
      { min: 42, label: "Arrived", detail: "Barking cough since bedtime." },
      { min: 16, label: "Treatment started", detail: "In PED-02 after a steroid dose." },
    ],
  },
  {
    id: "priya",
    mrn: "MG-48239",
    name: "Priya Shah",
    age: 41,
    sex: "F",
    complaint: "Syncope at work",
    acuity: 2,
    status: "admitted",
    unit: "Observation",
    arrivedMin: 250,
    stageMin: 140,
    clinicianId: "alvarez",
    roomId: "obs-02",
    destination: null,
    note: "Telemetry has been quiet. She is still inside the observation window.",
    vitals: { hr: 76, systolic: 118, diastolic: 72, temp: 36.6, spo2: 99, rr: 14, min: 30 },
    events: [
      { min: 250, label: "Arrived", detail: "Brief loss of consciousness at her desk." },
      { min: 140, label: "Admitted", detail: "Observation bed OBS-02 for monitoring." },
    ],
  },
  {
    id: "grace",
    mrn: "MG-48102",
    name: "Grace Lin",
    age: 27,
    sex: "F",
    complaint: "Closed hand laceration",
    acuity: 4,
    status: "discharged",
    unit: "ED",
    arrivedMin: 420,
    stageMin: 300,
    clinicianId: "singh",
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 74, systolic: 116, diastolic: 70, temp: 36.6, spo2: 99, rr: 14, min: 360 },
    events: [
      { min: 420, label: "Arrived", detail: "Walk-in for a repair." },
      { min: 300, label: "Discharged", detail: "Wound repaired and patient left with a ride." },
    ],
  },
  {
    id: "ivan",
    mrn: "MG-48118",
    name: "Ivan Petrov",
    age: 63,
    sex: "M",
    complaint: "Abdominal pain, now resolved",
    acuity: 3,
    status: "discharged",
    unit: "Observation",
    arrivedMin: 500,
    stageMin: 180,
    clinicianId: "alvarez",
    roomId: null,
    destination: null,
    note: null,
    vitals: { hr: 70, systolic: 130, diastolic: 78, temp: 36.7, spo2: 98, rr: 14, min: 200 },
    events: [
      { min: 500, label: "Arrived", detail: "Kept for serial exams." },
      { min: 180, label: "Discharged", detail: "Pain resolved. Left with family." },
    ],
  },
];

function fail(message: string): never {
  throw new Error(`Census seed is inconsistent: ${message}`);
}

export function assertSnapshot(snapshot: Snapshot): void {
  const clinicianIds = new Set(snapshot.clinicians.map((clinician) => clinician.id));
  const roomIds = new Set(snapshot.rooms.map((item) => item.id));
  const patientIds = new Set<string>();

  for (const patient of snapshot.patients) {
    if (patientIds.has(patient.id)) fail(`duplicate patient ${patient.id}`);
    patientIds.add(patient.id);
    if (patient.clinicianId && !clinicianIds.has(patient.clinicianId)) {
      fail(`${patient.name} points at an unknown physician`);
    }
    if (patient.status === "discharged" && patient.roomId) {
      fail(`${patient.name} is discharged but still holds ${patient.roomId}`);
    }
    if (patient.roomId && !roomIds.has(patient.roomId)) {
      fail(`${patient.name} points at an unknown room`);
    }
  }

  for (const item of snapshot.rooms) {
    const holders = snapshot.patients.filter(
      (patient) => patient.roomId === item.id && patient.status !== "discharged",
    );
    if (item.status === "occupied" && holders.length !== 1) {
      fail(`${item.name} is occupied by ${holders.length} patients`);
    }
    if (item.status !== "occupied" && holders.length > 0) {
      fail(`${item.name} is ${item.status} but still has a patient`);
    }
  }
}

export function createSnapshot(now = Date.now()): Snapshot {
  const snapshot: Snapshot = {
    patients: DRAFTS.map((draft) => visit(now, draft)),
    clinicians: CLINICIANS.map((clinician) => ({ ...clinician })),
    rooms: ROOMS.map((item) => ({ ...item })),
  };
  assertSnapshot(snapshot);
  return snapshot;
}
