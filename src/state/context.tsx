import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { FlowState, Snapshot } from "../domain/types";
import { loadSnapshot, type LoadMode } from "../data/api";
import { flowReducer, type FlowAction } from "./reducer";

interface FlowContextValue {
  state: FlowState;
  dispatch: Dispatch<FlowAction>;
  reload: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

function readDemo(): LoadMode {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("demo");
  if (value === "error" || value === "empty") return value;
  return null;
}

function createInitial(snapshot: Snapshot | undefined): FlowState {
  return {
    patients: snapshot?.patients ?? [],
    clinicians: snapshot?.clinicians ?? [],
    rooms: snapshot?.rooms ?? [],
    load: snapshot ? "ready" : "loading",
    error: null,
    notices: [],
  };
}

export function FlowProvider({ children, initial }: { children: ReactNode; initial?: Snapshot }) {
  const [state, dispatch] = useReducer(flowReducer, initial, createInitial);
  const skipLoad = useRef(initial !== undefined);
  const failNext = useRef(readDemo() === "error");
  const emptyDemo = useRef(readDemo() === "empty");

  const reload = useCallback(() => {
    dispatch({ type: "load-start" });
    loadSnapshot(null).then(
      (snapshot) => dispatch({ type: "hydrate", snapshot }),
      (error: unknown) =>
        dispatch({
          type: "load-error",
          message: error instanceof Error ? error.message : "The census service didn't respond.",
        }),
    );
  }, []);

  useEffect(() => {
    if (skipLoad.current) return;
    let active = true;
    const mode: LoadMode = failNext.current ? "error" : emptyDemo.current ? "empty" : null;
    dispatch({ type: "load-start" });
    loadSnapshot(mode).then(
      (snapshot) => {
        if (!active) return;
        failNext.current = false;
        dispatch({ type: "hydrate", snapshot });
      },
      (error: unknown) => {
        if (!active) return;
        failNext.current = false;
        dispatch({
          type: "load-error",
          message: error instanceof Error ? error.message : "The census service didn't respond.",
        });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.notices.length === 0) return;
    const oldest = state.notices[0];
    const timer = window.setTimeout(() => {
      dispatch({ type: "dismiss-notice", id: oldest.id });
    }, 4800);
    return () => window.clearTimeout(timer);
  }, [state.notices]);

  const value = useMemo(() => ({ state, dispatch, reload }), [state, reload]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useFlow must be used within FlowProvider");
  return value;
}
