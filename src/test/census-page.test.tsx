import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createSnapshot } from "../data/seed";
import { CensusPage } from "../features/census/CensusPage";
import { PatientPage } from "../features/patient/PatientPage";
import { FlowProvider } from "../state/context";

function renderCensus() {
  return render(
    <MemoryRouter initialEntries={["/census"]}>
      <FlowProvider initial={createSnapshot()}>
        <CensusPage />
      </FlowProvider>
    </MemoryRouter>,
  );
}

describe("census screen", () => {
  it("shows an empty state when the search matches nobody", async () => {
    const user = userEvent.setup();
    renderCensus();
    expect(screen.getByRole("link", { name: /Elena Voss/i })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Search" }), "zzzz");
    expect(screen.getByRole("heading", { name: "No patients match" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Elena Voss/i })).not.toBeInTheDocument();
  });
});

describe("patient chart", () => {
  it("keeps treatment locked until the visit has a physician and a room", () => {
    render(
      <MemoryRouter initialEntries={["/patients/aisha"]}>
        <FlowProvider initial={createSnapshot()}>
          <Routes>
            <Route path="/patients/:patientId" element={<PatientPage />} />
          </Routes>
        </FlowProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Start treatment" })).toBeDisabled();
    expect(screen.getByText(/assign a physician and an open room/i)).toBeInTheDocument();
  });
});
