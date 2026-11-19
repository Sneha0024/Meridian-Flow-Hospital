import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CURRENT_USER } from "../../domain/session";
import {
  ADVANCE_LABEL,
  CLINICIAN_STATUS_LABEL,
  SEX_LABEL,
  STATUS_LABEL,
  UNITS,
} from "../../domain/types";
import { advanceHelp, treatmentGate } from "../../domain/rules";
import { useNow } from "../../hooks/useNow";
import { useReturnTo } from "../../hooks/useReturnTo";
import { useTitle } from "../../hooks/useTitle";
import { doctorShort, formatTemp, formatTime, formatWait, vitalFlags, waitMinutes } from "../../lib/format";
import { isBoarding } from "../../lib/metrics";
import { backLabel } from "../../lib/returnTo";
import { useFlow } from "../../state/context";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/States";

const STEPS = [
  { key: "waiting", label: "Arrived" },
  { key: "triage", label: "Triage" },
  { key: "in-treatment", label: "Treatment" },
  { key: "admitted", label: "Admitted" },
  { key: "discharge-ready", label: "Discharge" },
] as const;

export function PatientPage() {
  const { state, dispatch } = useFlow();
  const now = useNow(30_000);
  const back = useReturnTo();
  const { patientId = "" } = useParams();
  const patient = state.patients.find((item) => item.id === patientId);
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useTitle(patient ? patient.name : "Chart");

  useEffect(() => {
    setConfirming(false);
  }, [patientId, patient?.status]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [patientId]);

  if (!patient) {
    return (
      <div className="page">
        <EmptyState
          title="This chart isn't on the board"
          body="It may have been a mistyped link. The census is unchanged."
        >
          <Link className="button quiet md" to={back}>
            {backLabel(back)}
          </Link>
        </EmptyState>
      </div>
    );
  }

  const room = state.rooms.find((item) => item.id === patient.roomId) ?? null;
  const clinician = state.clinicians.find((item) => item.id === patient.clinicianId) ?? null;
  const boarding = isBoarding(patient, state.rooms);
  const gate = treatmentGate(patient);
  const help = advanceHelp(patient.status);
  const flags = patient.vitals ? vitalFlags(patient.vitals, patient.age) : null;
  const held = waitMinutes(patient.stageAt, now);
  const currentIndex = patient.status === "discharged" ? STEPS.length : STEPS.findIndex((step) => step.key === patient.status);

  const roomChoices = state.rooms
    .filter((item) => item.status === "available" || item.id === patient.roomId)
    .slice()
    .sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name));

  const physicians = state.clinicians.slice().sort((a, b) => {
    const rank = (status: typeof a.status) => (status === "available" ? 0 : 1);
    return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
  });

  function advance() {
    dispatch({
      type: "advance",
      patientId: patient!.id,
      at: new Date().toISOString(),
      actor: CURRENT_USER.name,
    });
  }

  return (
    <div className="page detail">
      <Link className="back" to={back}>
        {backLabel(back)}
      </Link>
      <header className="identity">
        <p className="eyebrow">MRN {patient.mrn}</p>
        <h1 tabIndex={-1} ref={headingRef}>
          {patient.name}
        </h1>
        <p className="identity-meta">
          {patient.age} years · {SEX_LABEL[patient.sex]} · {patient.unit}
        </p>
        <div className="pill-row">
          <Pill tone={`esi-${patient.acuity}`}>ESI {patient.acuity}</Pill>
          <Pill tone={`st-${patient.status}`}>{STATUS_LABEL[patient.status]}</Pill>
          {boarding && <Pill tone="boarding">Boarding</Pill>}
        </div>
      </header>
      <p className="complaint-lg">{patient.complaint}</p>
      {boarding && (
        <p className="hint banner">
          {patient.destination
            ? `Waiting on a ${patient.destination} bed. Still in ${room?.name ?? "the ED"}.`
            : `Admitted and still in ${room?.name ?? "the ED"}.`}
        </p>
      )}

      <div className="detail-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="vitals-title">
            <h2 id="vitals-title" className="panel-title">
              Vitals
            </h2>
            {patient.vitals && flags ? (
              <>
                <ul className="vitals">
                  <Vital label="HR" value={String(patient.vitals.hr)} flag={flags.hr} />
                  <Vital
                    label="BP"
                    value={`${patient.vitals.systolic}/${patient.vitals.diastolic}`}
                    flag={flags.bp}
                  />
                  <Vital label="Temp" value={formatTemp(patient.vitals.temp)} flag={flags.temp} />
                  <Vital label="SpO2" value={`${patient.vitals.spo2}%`} flag={flags.spo2} />
                  <Vital label="RR" value={String(patient.vitals.rr)} flag={flags.rr} />
                </ul>
                <p className="hint">Recorded {formatTime(patient.vitals.takenAt)}.</p>
                {patient.age < 18 && (
                  <p className="hint">Range flags are for adults. This board does not score pediatric vitals.</p>
                )}
              </>
            ) : (
              <p className="hint">No vitals recorded yet.</p>
            )}
          </section>

          {patient.note && (
            <section className="panel" aria-labelledby="note-title">
              <h2 id="note-title" className="panel-title">
                Coordinator note
              </h2>
              <p className="note">{patient.note}</p>
            </section>
          )}

          <section className="panel" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="panel-title">
              Timeline
            </h2>
            <ol className="timeline">
              {patient.timeline.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.at}>{formatTime(event.at)}</time>
                  <div>
                    <strong>{event.label}</strong>
                    <p>{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="panel action-card" aria-labelledby="next-title">
          <h2 id="next-title" className="panel-title">
            Next step
          </h2>
          <ol className="stepper" aria-label="Visit progress">
            {STEPS.map((step, index) => {
              const stepState = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
              return (
                <li key={step.key} className={`step ${stepState}`} aria-current={stepState === "current" ? "step" : undefined}>
                  <span className="step-index" aria-hidden="true" />
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>

          {patient.status === "discharged" ? (
            <p className="hint">This visit is closed.</p>
          ) : confirming ? (
            <div className="confirm-box">
              <p>
                Complete the discharge
                {room ? ` and send ${room.name} to cleaning` : ""}?
              </p>
              <div className="form-actions">
                <Button variant="quiet" onClick={() => setConfirming(false)}>
                  Keep on the board
                </Button>
                <Button variant="danger" onClick={advance}>
                  Confirm discharge
                </Button>
              </div>
            </div>
          ) : (
            <>
              {patient.status === "discharge-ready" && (
                <p className="hint">Holding a bed for {formatWait(held)}.</p>
              )}
              {help && <p className="hint">{help}</p>}
              {gate && (
                <p className="hint warn-text" id="advance-gate">
                  {gate}
                </p>
              )}
              <Button
                disabled={Boolean(gate)}
                aria-describedby={gate ? "advance-gate" : undefined}
                onClick={() => {
                  if (patient.status === "discharge-ready") setConfirming(true);
                  else advance();
                }}
              >
                {ADVANCE_LABEL[patient.status]}
              </Button>
            </>
          )}

          <div className="assign">
            <label className="field" htmlFor="physician">
              <span className="field-label">Physician</span>
              <select
                id="physician"
                value={patient.clinicianId ?? ""}
                disabled={patient.status === "discharged"}
                onChange={(event) =>
                  dispatch({
                    type: "assign-clinician",
                    patientId: patient.id,
                    clinicianId: event.target.value || null,
                    at: new Date().toISOString(),
                    actor: CURRENT_USER.name,
                  })
                }
              >
                <option value="">Unassigned</option>
                {physicians.map((item) => {
                  const blocked = item.status !== "available" && item.id !== patient.clinicianId;
                  return (
                    <option key={item.id} value={item.id} disabled={blocked}>
                      {doctorShort(item.name)} · {item.specialty}
                      {item.status !== "available" ? ` · ${CLINICIAN_STATUS_LABEL[item.status]}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            {clinician && clinician.status !== "available" && (
              <p className="hint">
                {doctorShort(clinician.name)} is {CLINICIAN_STATUS_LABEL[clinician.status].toLowerCase()}.
              </p>
            )}

            <label className="field" htmlFor="room">
              <span className="field-label">Room</span>
              <select
                id="room"
                value={patient.roomId ?? ""}
                disabled={patient.status === "discharged"}
                onChange={(event) =>
                  dispatch({
                    type: "assign-room",
                    patientId: patient.id,
                    roomId: event.target.value || null,
                    at: new Date().toISOString(),
                    actor: CURRENT_USER.name,
                  })
                }
              >
                <option value="">No room</option>
                {UNITS.map((unit) => {
                  const group = roomChoices.filter((item) => item.unit === unit);
                  if (group.length === 0) return null;
                  return (
                    <optgroup key={unit} label={unit}>
                      {group.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.kind}
                          {item.id === patient.roomId ? " · current" : ""}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            {roomChoices.filter((item) => item.status === "available").length === 0 && !patient.roomId && (
              <p className="hint">No open rooms right now.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Vital({ label, value, flag }: { label: string; value: string; flag?: string }) {
  return (
    <li className={flag ? "vital flagged" : "vital"}>
      <span className="vital-label">{label}</span>
      <span className="vital-value">{value}</span>
      {flag && <span className="vital-flag">{flag}</span>}
    </li>
  );
}
