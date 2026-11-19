import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { UNITS } from "../../domain/types";
import { useTitle } from "../../hooks/useTitle";
import { doctorShort } from "../../lib/format";
import { fromHere } from "../../lib/returnTo";
import { useFlow } from "../../state/context";
import { Pill } from "../../components/ui/Pill";

export function RoomsPage() {
  const { state, dispatch } = useFlow();
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useTitle("Rooms and beds");
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const open = state.rooms.filter((room) => room.status === "available").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{open} open right now</p>
          <h1 tabIndex={-1} ref={headingRef}>
            Rooms and beds
          </h1>
          <p className="lede">Open rooms are assigned from a chart. A room that was just vacated waits here until it is marked clean.</p>
        </div>
      </div>
      {UNITS.map((unit) => {
        const rooms = state.rooms.filter((room) => room.unit === unit);
        if (rooms.length === 0) return null;
        const occupied = rooms.filter((room) => room.status === "occupied").length;
        return (
          <section key={unit} className="room-section" aria-labelledby={`unit-${unit}`}>
            <div className="section-head">
              <h2 id={`unit-${unit}`}>{unit}</h2>
              <p>
                {occupied} of {rooms.length} filled
              </p>
            </div>
            <ul className="room-grid">
              {rooms.map((room) => {
                const patient = state.patients.find(
                  (item) => item.roomId === room.id && item.status !== "discharged",
                );
                const clinician = state.clinicians.find((item) => item.id === patient?.clinicianId);
                if (patient) {
                  return (
                    <li key={room.id}>
                      <Link
                        to={`/patients/${patient.id}`}
                        state={fromHere(location.pathname, location.search)}
                        className="room-tile occupied"
                      >
                        <span className="room-name">{room.name}</span>
                        <span className="room-patient">{patient.name}</span>
                        <span className="sub">
                          <Pill tone={`esi-${patient.acuity}`}>ESI {patient.acuity}</Pill>
                        </span>
                        <span className="sub">{clinician ? doctorShort(clinician.name) : "Unassigned"}</span>
                      </Link>
                    </li>
                  );
                }
                if (room.status === "cleaning") {
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        className="room-tile cleaning"
                        aria-label={`Mark ${room.name} clean`}
                        onClick={() => dispatch({ type: "mark-room-clean", roomId: room.id })}
                      >
                        <span className="room-name">{room.name}</span>
                        <span className="sub">{room.kind}</span>
                        <span className="room-state">Cleaning</span>
                        <span className="room-action">Mark clean</span>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={room.id}>
                    <div className={`room-tile ${room.status}`}>
                      <span className="room-name">{room.name}</span>
                      <span className="sub">{room.kind}</span>
                      <span className="room-state">{room.status === "blocked" ? "Blocked" : "Open"}</span>
                      {room.note && <span className="sub">{room.note}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
