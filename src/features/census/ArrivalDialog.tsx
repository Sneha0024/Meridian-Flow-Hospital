import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CURRENT_USER } from "../../domain/session";
import { UNITS, type Acuity, type Sex, type Unit } from "../../domain/types";
import { createArrival } from "../../lib/arrival";
import { useFlow } from "../../state/context";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";

const LEVELS: Acuity[] = [1, 2, 3, 4, 5];

export function ArrivalDialog({ onClose }: { onClose: () => void }) {
  const { dispatch } = useFlow();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [unit, setUnit] = useState<Unit>("ED");
  const [acuity, setAcuity] = useState<Acuity | null>(null);
  const [complaint, setComplaint] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedAge = Number(age);
    if (name.trim().length < 2) {
      setError("Enter the patient's name.");
      return;
    }
    if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setError("Enter an age from 0 to 120.");
      return;
    }
    if (!sex) {
      setError("Choose a sex.");
      return;
    }
    if (!acuity) {
      setError("Choose an acuity. It is not defaulted, so a high-acuity arrival cannot be filed as routine by accident.");
      return;
    }
    if (complaint.trim().length < 3) {
      setError("Add a short complaint.");
      return;
    }

    const patient = createArrival(
      { name, age: parsedAge, sex, unit, acuity, complaint },
      Date.now(),
    );
    dispatch({ type: "arrive", patient });
    onClose();
    navigate(`/patients/${patient.id}`);
  }

  return (
    <Dialog title="Register an arrival" onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit}>
        <p className="hint span-2">
          {CURRENT_USER.firstName}, this adds someone to the waiting queue. It does not assign a room or a physician.
        </p>
        {error && (
          <p className="form-error span-2" role="alert">
            {error}
          </p>
        )}
        <label className="field">
          <span className="field-label">Full name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        </label>
        <label className="field">
          <span className="field-label">Age</span>
          <input
            inputMode="numeric"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field-label">Sex</span>
          <select value={sex} onChange={(event) => setSex(event.target.value as Sex | "")}>
            <option value="">Choose</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="X">Another</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Service</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
            {UNITS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="span-2 esi-field">
          <legend className="field-label">Acuity</legend>
          <div className="esi-pick">
            {LEVELS.map((level) => (
              <label key={level} className={`esi-option esi-${level}`}>
                <input
                  type="radio"
                  name="acuity"
                  value={level}
                  checked={acuity === level}
                  onChange={() => setAcuity(level)}
                />
                <span>ESI {level}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field span-2">
          <span className="field-label">Complaint</span>
          <textarea value={complaint} onChange={(event) => setComplaint(event.target.value)} />
        </label>
        <div className="form-actions span-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add to the queue</Button>
        </div>
      </form>
    </Dialog>
  );
}
