import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { STATUS_LABEL, UNITS, type CensusQuery, type Unit } from "../../domain/types";
import { useNow } from "../../hooks/useNow";
import { useTitle } from "../../hooks/useTitle";
import {
  applyCensus,
  censusParams,
  groupPatients,
  isDefaultQuery,
  parseCensusQuery,
  rememberCensus,
} from "../../lib/census";
import { ageSex, doctorShort, formatWait, waitMinutes, waitTarget } from "../../lib/format";
import { isBoarding } from "../../lib/metrics";
import { fromHere } from "../../lib/returnTo";
import { useFlow } from "../../state/context";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/States";
import { ArrivalDialog } from "./ArrivalDialog";

export function CensusPage() {
  const { state } = useFlow();
  const now = useNow(30_000);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const query = useMemo(() => parseCensusQuery(params), [params]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useTitle("Patient census");
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    rememberCensus(location.search);
  }, [location.search]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("input, textarea, select, dialog")) return;
      event.preventDefault();
      document.getElementById("census-search")?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function update(partial: Partial<CensusQuery>) {
    const next = censusParams({ ...query, ...partial });
    setParams(next, { replace: true });
  }

  function clear() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const list = useMemo(() => applyCensus(state.patients, query, now), [state.patients, query, now]);
  const groups = useMemo(() => groupPatients(list, query.group), [list, query.group]);
  const dirty = !isDefaultQuery(query);
  const rooms = state.rooms;
  const clinicians = state.clinicians;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Active visits</p>
          <h1 tabIndex={-1} ref={headingRef}>
            Patient census
          </h1>
        </div>
        <Button onClick={() => setArrivalOpen(true)}>Register arrival</Button>
      </div>

      <form
        role="search"
        className="toolbar"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="filters">
          <label className="field grow" htmlFor="census-search">
            <span className="field-label">Search</span>
            <input
              id="census-search"
              type="search"
              value={query.q}
              placeholder="Name, MRN, or complaint"
              autoComplete="off"
              onChange={(event) => update({ q: event.target.value })}
            />
          </label>
          <label className="field" htmlFor="filter-status">
            <span className="field-label">Status</span>
            <select
              id="filter-status"
              value={query.status}
              onChange={(event) => update({ status: event.target.value as CensusQuery["status"] })}
            >
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="triage">In triage</option>
              <option value="in-treatment">In treatment</option>
              <option value="admitted">Admitted</option>
              <option value="discharge-ready">Discharge ready</option>
              <option value="discharged">Discharged today</option>
              <option value="all">All visits</option>
            </select>
          </label>
          <label className="field" htmlFor="filter-unit">
            <span className="field-label">Service</span>
            <select
              id="filter-unit"
              value={query.unit}
              onChange={(event) => update({ unit: event.target.value as Unit | "all" })}
            >
              <option value="all">All services</option>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="filter-acuity">
            <span className="field-label">Acuity</span>
            <select
              id="filter-acuity"
              value={String(query.acuity)}
              onChange={(event) => {
                const value = event.target.value;
                update({
                  acuity: value === "all" || value === "high" ? value : (Number(value) as CensusQuery["acuity"]),
                });
              }}
            >
              <option value="all">All acuities</option>
              <option value="high">ESI 1–2</option>
              <option value="1">ESI 1</option>
              <option value="2">ESI 2</option>
              <option value="3">ESI 3</option>
              <option value="4">ESI 4</option>
              <option value="5">ESI 5</option>
            </select>
          </label>
          <label className="field" htmlFor="filter-sort">
            <span className="field-label">Sort</span>
            <select
              id="filter-sort"
              value={query.sort}
              onChange={(event) => update({ sort: event.target.value as CensusQuery["sort"] })}
            >
              <option value="priority">Priority</option>
              <option value="wait">Longest wait</option>
              <option value="newest">Newest arrival</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="field" htmlFor="filter-group">
            <span className="field-label">Group</span>
            <select
              id="filter-group"
              value={query.group}
              onChange={(event) => update({ group: event.target.value as CensusQuery["group"] })}
            >
              <option value="none">No grouping</option>
              <option value="status">By status</option>
              <option value="unit">By service</option>
            </select>
          </label>
        </div>
        <div className="toolbar-foot">
          <p className="result-line">
            {list.length === 0
              ? "No patients in this view"
              : `${list.length} ${list.length === 1 ? "patient" : "patients"}`}
            {dirty ? " · filtered" : ""}
          </p>
          <p className="key-hint">
            Press <kbd>/</kbd> to search
          </p>
          {dirty && (
            <button type="button" className="text-button" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {list.length === 0 ? (
        state.patients.length === 0 ? (
          <EmptyState
            title="The house is empty"
            body="Register an arrival when the next patient reaches the desk."
          >
            <Button onClick={() => setArrivalOpen(true)}>Register arrival</Button>
          </EmptyState>
        ) : (
          <EmptyState
            title="No patients match"
            body="Try a different name, acuity, or service. The census itself has not changed."
          >
            <Button variant="quiet" onClick={clear}>
              Clear filters
            </Button>
          </EmptyState>
        )
      ) : (
        <div className="census">
          <div className="census-head" aria-hidden="true">
            <span>Acuity</span>
            <span>Patient</span>
            <span>Complaint</span>
            <span>Status</span>
            <span>Wait</span>
            <span>Physician</span>
            <span>Location</span>
          </div>
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={query.group === "none" ? undefined : `group-${group.key}`}>
              {query.group !== "none" && (
                <h2 id={`group-${group.key}`} className="group-title">
                  {group.label} <span className="count">{group.patients.length}</span>
                </h2>
              )}
              <ul className="census-list">
                {group.patients.map((patient) => {
                  const minutes = waitMinutes(patient.arrivalAt, now);
                  const over = patient.status !== "discharged" && minutes >= waitTarget(patient.acuity);
                  const room = rooms.find((item) => item.id === patient.roomId);
                  const clinician = clinicians.find((item) => item.id === patient.clinicianId);
                  const boarding = isBoarding(patient, rooms);
                  return (
                    <li key={patient.id}>
                      <Link
                        to={`/patients/${patient.id}`}
                        state={fromHere(location.pathname, location.search)}
                        className="census-row"
                        data-acuity={patient.acuity}
                      >
                        <span className="cell acuity">
                          <Pill tone={`esi-${patient.acuity}`}>ESI {patient.acuity}</Pill>
                        </span>
                        <span className="cell person">
                          <strong>{patient.name}</strong>
                          <span className="sub">
                            {patient.mrn} · {ageSex(patient.age, patient.sex)} · {patient.unit}
                          </span>
                        </span>
                        <span className="cell complaint">{patient.complaint}</span>
                        <span className="cell status">
                          <Pill tone={`st-${patient.status}`}>{STATUS_LABEL[patient.status]}</Pill>
                          {boarding && <Pill tone="boarding">Boarding</Pill>}
                        </span>
                        <span className={over ? "cell wait over" : "cell wait"}>
                          <span aria-hidden="true">{formatWait(minutes)}</span>
                          <span className="sr-only">
                            {minutes} minutes since arrival{over ? ", over target" : ""}
                          </span>
                        </span>
                        <span className="cell doc">{clinician ? doctorShort(clinician.name) : "Unassigned"}</span>
                        <span className="cell loc">{room ? room.name : "No room"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {arrivalOpen && <ArrivalDialog onClose={() => setArrivalOpen(false)} />}
    </div>
  );
}
