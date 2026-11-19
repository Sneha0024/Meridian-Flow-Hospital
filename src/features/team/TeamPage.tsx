import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ClinicianStatus } from "../../domain/types";
import { useTitle } from "../../hooks/useTitle";
import { doctorShort, initials } from "../../lib/format";
import { clinicianLoad } from "../../lib/metrics";
import { fromHere } from "../../lib/returnTo";
import { useFlow } from "../../state/context";

export function TeamPage() {
  const { state, dispatch } = useFlow();
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useTitle("Physicians");
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const ordered = state.clinicians.slice().sort((a, b) => {
    const rank = (status: ClinicianStatus) => (status === "available" ? 0 : status === "on-break" ? 1 : 2);
    return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Coverage</p>
          <h1 tabIndex={-1} ref={headingRef}>
            Physicians
          </h1>
          <p className="lede">
            On-duty physicians can take the next patient. Changing a status does not move the charts already in their care.
          </p>
        </div>
      </div>
      <ul className="team-grid">
        {ordered.map((clinician) => {
          const patients = state.patients.filter(
            (patient) => patient.clinicianId === clinician.id && patient.status !== "discharged",
          );
          const load = clinicianLoad(state, clinician.id);
          const stranded = clinician.status !== "available" && load > 0;
          return (
            <li key={clinician.id} id={clinician.id} className="clinician-card" data-alert={stranded ? "true" : "false"}>
              <div className="clinician-top">
                <span className={`avatar lg dot-${clinician.status}`} aria-hidden="true">
                  {initials(clinician.name)}
                </span>
                <div>
                  <h2>{doctorShort(clinician.name)}</h2>
                  <p className="sub">
                    {clinician.specialty} · {clinician.unit}
                  </p>
                </div>
              </div>
              <label className="field" htmlFor={`status-${clinician.id}`}>
                <span className="sr-only">Shift status for {doctorShort(clinician.name)}</span>
                <span className="field-label" aria-hidden="true">
                  Shift status
                </span>
                <select
                  id={`status-${clinician.id}`}
                  value={clinician.status}
                  onChange={(event) =>
                    dispatch({
                      type: "set-clinician-status",
                      clinicianId: clinician.id,
                      status: event.target.value as ClinicianStatus,
                    })
                  }
                >
                  <option value="available">On duty</option>
                  <option value="on-break">On break</option>
                  <option value="off-shift">Off shift</option>
                </select>
              </label>
              {stranded && (
                <p className="hint">
                  Still assigned. Reassign {load === 1 ? "the chart" : "the charts"} before this shift ends.
                </p>
              )}
              {patients.length === 0 ? (
                <p className="hint">No active patients.</p>
              ) : (
                <ul className="patient-links">
                  {patients.map((patient) => (
                    <li key={patient.id}>
                      <Link to={`/patients/${patient.id}`} state={fromHere(location.pathname, location.search)}>
                        {patient.name}
                      </Link>
                      <span className="sub">{patient.complaint}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
