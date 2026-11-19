import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CURRENT_USER } from "../../domain/session";
import { STATUS_LABEL } from "../../domain/types";
import { useNow } from "../../hooks/useNow";
import { useTitle } from "../../hooks/useTitle";
import { comparePriority } from "../../lib/census";
import { doctorShort, formatWait, greeting, boardTitle, waitMinutes, waitTarget } from "../../lib/format";
import { boardNarrative, buildMetrics, clinicianLoad } from "../../lib/metrics";
import { fromHere } from "../../lib/returnTo";
import { useFlow } from "../../state/context";
import { OccupancyRing } from "../../components/OccupancyRing";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { ArrivalDialog } from "../census/ArrivalDialog";

export function DashboardPage() {
  const { state } = useFlow();
  const now = useNow(30_000);
  const location = useLocation();
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const metrics = useMemo(() => buildMetrics(state, now), [state, now]);
  const title = boardTitle(now);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useTitle(title);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const queue = state.patients
    .filter((patient) => patient.status === "waiting" || patient.status === "triage")
    .slice()
    .sort((a, b) => comparePriority(a, b, now));

  const linkState = fromHere(location.pathname, location.search);
  const clinicians = state.clinicians;

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {greeting(now)}, {CURRENT_USER.firstName}
            <span className="eyebrow-dot" aria-hidden="true">
              ·
            </span>
            {metrics.active} in house
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            {title}
          </h1>
          <p className="lede">{boardNarrative(metrics)}</p>
        </div>
        <div className="hero-actions">
          {metrics.breaches.length > 0 ? (
            <ButtonLink to="/census?status=waiting&acuity=high">Review long waits</ButtonLink>
          ) : (
            <ButtonLink to="/census">Open the census</ButtonLink>
          )}
          <Button variant="quiet" onClick={() => setArrivalOpen(true)}>
            Register arrival
          </Button>
        </div>
      </section>

      <section className="metrics" aria-label="Board summary">
        <article className={metrics.breaches.length > 0 ? "metric alert" : "metric"}>
          <p className="metric-label">Waiting</p>
          <p className="metric-value">{metrics.waiting}</p>
          <p className="metric-note">
            {metrics.breaches.length > 0
              ? `${metrics.breaches.length} past the 30-minute target`
              : metrics.waiting === 0
                ? "Queue is clear"
                : `Longest wait ${formatWait(metrics.longestWait)}`}
          </p>
        </article>
        <article className={metrics.boarding.length > 0 ? "metric warn" : "metric"}>
          <p className="metric-label">Boarding</p>
          <p className="metric-value">{metrics.boarding.length}</p>
          <p className="metric-note">{metrics.boarding.length === 0 ? "No ED boarding" : "Admitted, still in the ED"}</p>
        </article>
        <article className="metric with-ring">
          <div className="metric-copy">
            <p className="metric-label">Occupied</p>
            <p className="metric-value">{metrics.occupied}</p>
            <p className="metric-note">
              {metrics.available} open · {metrics.cleaning} cleaning
            </p>
          </div>
          <OccupancyRing
            value={metrics.occupancyPct}
            label={`${metrics.occupancyPct} percent of staffed beds filled, ${metrics.occupied} of ${metrics.staffedBeds}. ${metrics.available} open, ${metrics.cleaning} cleaning, ${metrics.blocked} blocked.`}
          />
        </article>
        <article className={metrics.dischargeReady.length > 0 ? "metric calm" : "metric"}>
          <p className="metric-label">Discharge holds</p>
          <p className="metric-value">{metrics.dischargeReady.length}</p>
          <p className="metric-note">
            {metrics.dischargeReady.length === 0 ? "No beds held" : "Ready to leave, still in a room"}
          </p>
        </article>
        <article className="metric">
          <p className="metric-label">On duty</p>
          <p className="metric-value">{metrics.onDuty}</p>
          <p className="metric-note">of {metrics.clinicianCount} physicians</p>
        </article>
      </section>

      <div className="layout-split">
        <section className="panel" aria-labelledby="queue-title">
          <div className="panel-head">
            <h2 id="queue-title" className="panel-title">
              Not in a room yet
            </h2>
            <Link className="panel-link" to="/census?status=waiting">
              Waiting list
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="hint">No one is waiting. New arrivals will show up here.</p>
          ) : (
            <div className="queue">
              {queue.map((patient) => {
                const minutes = waitMinutes(patient.arrivalAt, now);
                const target = waitTarget(patient.acuity);
                const over = minutes >= target;
                const width = Math.min(100, Math.round((minutes / target) * 100));
                return (
                  <Link
                    key={patient.id}
                    to={`/patients/${patient.id}`}
                    state={linkState}
                    className="queue-item"
                  >
                    <Pill tone={`esi-${patient.acuity}`}>ESI {patient.acuity}</Pill>
                    <span className="queue-main">
                      <span className="queue-name">{patient.name}</span>
                      <span className="queue-complaint">{patient.complaint}</span>
                      <span className="sub">
                        {STATUS_LABEL[patient.status]} · {patient.unit}
                      </span>
                    </span>
                    <span className="wait-block">
                      <span className={over ? "wait-value over" : "wait-value"}>
                        <span aria-hidden="true">{formatWait(minutes)}</span>
                        <span className="sr-only">
                          {minutes} minutes since arrival{over ? ", over target" : ""}
                        </span>
                      </span>
                      <span className="wait-track" aria-hidden="true">
                        <span className={over ? "wait-fill over" : "wait-fill"} style={{ width: `${width}%` }} />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="hold-title">
          <div className="panel-head">
            <h2 id="hold-title" className="panel-title">
              Holding a bed
            </h2>
            <Link className="panel-link" to="/census?status=discharge-ready">
              See holds
            </Link>
          </div>
          {metrics.dischargeReady.length === 0 ? (
            <p className="hint">No beds are held for discharge.</p>
          ) : (
            <div className="queue">
              {metrics.dischargeReady.map((patient) => {
                const room = state.rooms.find((item) => item.id === patient.roomId);
                const held = waitMinutes(patient.stageAt, now);
                return (
                  <Link key={patient.id} to={`/patients/${patient.id}`} state={linkState} className="queue-item">
                    <Pill tone="st-discharge-ready">Ready</Pill>
                    <span className="queue-main">
                      <span className="queue-name">{patient.name}</span>
                      <span className="sub">
                        {room?.name ?? "No room"} · {patient.unit}
                      </span>
                    </span>
                    <span className="wait-block">
                      <span className="wait-value">
                        <span aria-hidden="true">{formatWait(held)}</span>
                        <span className="sr-only">{held} minutes holding a bed</span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {metrics.boarding.length > 0 && (
        <section className="panel boarding" aria-labelledby="boarding-title">
          <div className="panel-head">
            <h2 id="boarding-title" className="panel-title">
              Boarding in the ED
            </h2>
          </div>
          <div className="queue">
            {metrics.boarding.map((patient) => {
              const room = state.rooms.find((item) => item.id === patient.roomId);
              return (
                <Link key={patient.id} to={`/patients/${patient.id}`} state={linkState} className="queue-item">
                  <Pill tone="boarding">Boarding</Pill>
                  <span className="queue-main">
                    <span className="queue-name">{patient.name}</span>
                    <span className="sub">
                      {patient.destination ? `Waiting on ${patient.destination}` : patient.unit}
                      {room ? ` · still in ${room.name}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="units-title">
        <div className="panel-head">
          <h2 id="units-title" className="panel-title">
            Where the beds are
          </h2>
          <Link className="panel-link" to="/rooms">
            Room board
          </Link>
        </div>
        <ul className="legend">
          <li>
            <span className="swatch occupied" aria-hidden="true" /> Occupied
          </li>
          <li>
            <span className="swatch cleaning" aria-hidden="true" /> Cleaning
          </li>
          <li>
            <span className="swatch blocked" aria-hidden="true" /> Blocked
          </li>
          <li>
            <span className="swatch available" aria-hidden="true" /> Open
          </li>
        </ul>
        <div className="unit-list">
          {metrics.units.map((unit) => (
            <div key={unit.unit} className="bar-row">
              <span className="bar-label">{unit.unit}</span>
              <div
                className="bar-track"
                role="img"
                aria-label={`${unit.unit}: ${unit.occupied} occupied, ${unit.cleaning} cleaning, ${unit.blocked} blocked, ${unit.available} open, of ${unit.total}`}
              >
                <span className="seg occupied" style={{ flexGrow: unit.occupied }} />
                <span className="seg cleaning" style={{ flexGrow: unit.cleaning }} />
                <span className="seg blocked" style={{ flexGrow: unit.blocked }} />
                <span className="seg available" style={{ flexGrow: unit.available }} />
              </div>
              <span className="bar-meta">{unit.available} open</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="team-title">
        <div className="panel-head">
          <h2 id="team-title" className="panel-title">
            Physicians
          </h2>
          <Link className="panel-link" to="/team">
            Coverage
          </Link>
        </div>
        <div className="team-strip">
          {clinicians.map((clinician) => {
            const load = clinicianLoad(state, clinician.id);
            const alert = clinician.status !== "available" && load > 0;
            return (
              <Link
                key={clinician.id}
                to={`/team#${clinician.id}`}
                className="team-chip"
                data-alert={alert ? "true" : "false"}
              >
                <span className={`avatar dot-${clinician.status}`} aria-hidden="true">
                  {clinician.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <strong>{doctorShort(clinician.name)}</strong>
                  <span className="sub">{clinician.specialty}</span>
                  <span className="sub">
                    {load} in care · {clinician.status === "available" ? "On duty" : clinician.status === "on-break" ? "On break" : "Off shift"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      {arrivalOpen && <ArrivalDialog onClose={() => setArrivalOpen(false)} />}
    </div>
  );
}
