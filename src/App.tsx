import { Component, type ErrorInfo, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ButtonLink } from "./components/ui/Button";
import { EmptyState, ErrorState } from "./components/ui/States";
import { FlowProvider } from "./state/context";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CensusPage } from "./features/census/CensusPage";
import { PatientPage } from "./features/patient/PatientPage";
import { RoomsPage } from "./features/rooms/RoomsPage";
import { TeamPage } from "./features/team/TeamPage";
import { useTitle } from "./hooks/useTitle";

function NotFoundPage() {
  useTitle("Not found");
  return (
    <div className="page">
      <EmptyState
        title="That page isn't on the board"
        body="The flow desk keeps the census, the rooms, and the physicians on shift."
      >
        <ButtonLink to="/" variant="quiet">
          Back to the board
        </ButtonLink>
      </EmptyState>
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ paddingTop: 48 }}>
          <ErrorState
            title="The board hit a problem"
            message="Something in the interface failed. Reload to fetch the census again."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <FlowProvider>
        <AppErrorBoundary>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="census" element={<CensusPage />} />
              <Route path="patients/:patientId" element={<PatientPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AppErrorBoundary>
      </FlowProvider>
    </BrowserRouter>
  );
}
