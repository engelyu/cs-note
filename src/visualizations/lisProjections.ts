import type { ExecutionFrame, FocusTarget } from "../core/types";
import type { LisState } from "./lisModel";

type LisFrame = ExecutionFrame<LisState>;

export type LisVariableRow = {
  index: number;
  value: number;
  dp: number;
  prev: number | null;
  selected: boolean;
  focused: boolean;
};

export type LisConcept = { id: string; label: string; detail: string; active: boolean; focus: FocusTarget };
export type LisTimelineEntry = { index: number; eventId: string; phase: string; label: string; active: boolean; focus?: FocusTarget };

export function projectLisVariables(frame: LisFrame): LisVariableRow[] {
  const { state } = frame;
  return state.values.map((value, index) => ({
    index,
    value,
    dp: state.dp[index],
    prev: state.prev[index],
    selected: state.sequence.includes(index),
    focused: state.currentIndex === index || state.compareIndex === index,
  }));
}

export function projectLisConceptLabel(state: LisState): string {
  if (state.phase === "compare" || state.phase === "update" || state.phase === "skip") return "DP transition";
  if (state.phase === "reconstruct" || state.phase === "done") return "reconstruction";
  if (state.phase === "best") return "global best";
  return "dp[i]";
}

export function projectLisConcepts(frame: LisFrame): LisConcept[] {
  const { state } = frame;
  const eventFocus = frame.event.focus?.kind === "concept" ? frame.event.focus.id : null;
  const best = state.bestIndex === null ? "none" : `a[${state.bestIndex}] = ${state.values[state.bestIndex]}`;
  return [
    { id: "dp", label: "dp[i]", detail: "Best increasing subsequence ending at each position.", active: eventFocus === "dp" || state.phase === "init" || state.phase === "visit", focus: { kind: "concept", id: "dp" } },
    { id: "predecessor", label: "predecessor", detail: "prev[i] points to the earlier value that extends the best subsequence.", active: eventFocus === "predecessor" || state.phase === "update", focus: { kind: "concept", id: "predecessor" } },
    { id: "best", label: "global best", detail: `Current best ends at ${best}.`, active: eventFocus === "best" || state.phase === "best", focus: { kind: "concept", id: "best" } },
    { id: "reconstruct", label: "reconstruction", detail: state.sequence.length > 0 ? `[${state.sequence.map((index) => state.values[index]).join(", ")}]` : "Follow prev[] after the DP table is complete.", active: eventFocus === "reconstruct" || state.phase === "reconstruct" || state.phase === "done", focus: { kind: "concept", id: "reconstruct" } },
  ];
}

export function projectLisTimeline(frames: readonly LisFrame[], currentIndex: number): LisTimelineEntry[] {
  return frames.map((frame) => ({ index: frame.index, eventId: frame.event.id, phase: frame.event.phase, label: frame.event.label, active: frame.index === currentIndex, focus: frame.event.focus }));
}
