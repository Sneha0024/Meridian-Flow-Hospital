import type { Snapshot } from "../domain/types";
import { createSnapshot } from "./seed";

export type LoadMode = "error" | "empty" | null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function loadSnapshot(mode: LoadMode): Promise<Snapshot> {
  await wait(mode === "error" ? 420 : 720);
  if (mode === "error") {
    throw new Error("The census service didn't respond. Nothing on the board was changed.");
  }
  const snapshot = createSnapshot();
  if (mode === "empty") {
    snapshot.patients = [];
    snapshot.rooms = snapshot.rooms.map((item) =>
      item.status === "blocked" ? item : { ...item, status: "available" },
    );
  }
  return snapshot;
}
