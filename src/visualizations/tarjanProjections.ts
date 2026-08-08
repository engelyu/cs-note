import type { ExecutionFrame, FocusTarget } from "../core/types";
import type { TarjanState } from "./tarjanModel";

type TarjanFrame = ExecutionFrame<TarjanState>;

export type TarjanVariableRow = {
  label: string;
  disc: number | null;
  low: number | null;
  onStack: boolean;
  inComponent: boolean;
  component: string | null;
  focused: boolean;
};

export type TarjanCallStackEntry = {
  label: string;
  disc: number;
  low: number;
  depth: number;
  active: boolean;
};

export type TarjanConcept = {
  id: string;
  label: string;
  detail: string;
  active: boolean;
  focus: FocusTarget;
};

export type TarjanTimelineEntry = {
  index: number;
  eventId: string;
  phase: string;
  label: string;
  active: boolean;
  focus?: FocusTarget;
};

export function projectTarjanVariables(frame: TarjanFrame): TarjanVariableRow[] {
  const { state } = frame;
  return state.labels.map((label, index) => ({
    label,
    disc: state.disc[index] < 0 ? null : state.disc[index],
    low: state.low[index] < 0 ? null : state.low[index],
    onStack: state.onStack[index],
    inComponent: state.components.some((component) => component.includes(index)),
    component: state.components.find((component) => component.includes(index))?.map((member) => state.labels[member]).join(", ") ?? null,
    focused: state.current === index,
  }));
}

export function projectTarjanConceptLabel(state: TarjanState): string {
  if (state.phase === "back-edge") return "low-link";
  if (state.phase === "pop-scc" || state.components.length > 0) return "SCC root";
  if (state.stack.length > 0) return "onStack";
  return "DFS";
}

export function projectTarjanCallStack(frame: TarjanFrame): TarjanCallStackEntry[] {
  return [...frame.state.stack].reverse().map((index, depth) => ({
    label: frame.state.labels[index],
    disc: frame.state.disc[index],
    low: frame.state.low[index],
    depth,
    active: depth === 0,
  }));
}

export function projectTarjanConcepts(frame: TarjanFrame): TarjanConcept[] {
  const { state } = frame;
  const currentLabel = state.current == null ? null : state.labels[state.current];
  const currentLow = state.current == null ? null : state.low[state.current];
  const eventConceptFocus = frame.event.focus?.kind === "concept" ? frame.event.focus.id : null;
  const componentSummary = state.components.length > 0
    ? state.components.map((component) => `{${component.map((member) => state.labels[member]).join(", ")}}`).join(" · ")
    : "none yet";

  return [
    {
      id: "onStack",
      label: "onStack",
      detail: state.stack.length > 0 ? `${state.stack.length} vertices retained` : "empty",
      active: eventConceptFocus === "onStack" || state.phase === "visit" || state.phase === "back-edge" || state.phase === "wait",
      focus: { kind: "concept", id: "onStack" },
    },
    {
      id: "low-link",
      label: "low-link",
      detail: currentLabel == null ? "waiting for a vertex" : `low[${currentLabel}] = ${currentLow}`,
      active: eventConceptFocus === "low-link" || state.phase === "back-edge" || state.phase === "return",
      focus: { kind: "concept", id: "low-link" },
    },
    {
      id: "scc-root",
      label: "SCC root",
      detail: state.components.length > 0 ? `${state.components.length} components: ${componentSummary}` : "not closed yet",
      active: eventConceptFocus === "scc-root" || state.phase === "root" || state.phase === "pop-scc",
      focus: { kind: "concept", id: "scc-root" },
    },
    {
      id: "scc",
      label: "SCC result",
      detail: componentSummary,
      active: eventConceptFocus === "scc" || state.phase === "pop-scc" || state.phase === "done",
      focus: { kind: "concept", id: "scc" },
    },
  ];
}

export function projectTarjanTimeline(
  frames: readonly TarjanFrame[],
  currentIndex: number,
): TarjanTimelineEntry[] {
  return frames.map((frame) => ({
    index: frame.index,
    eventId: frame.event.id,
    phase: frame.event.phase,
    label: frame.event.label,
    active: frame.index === currentIndex,
    focus: frame.event.focus,
  }));
}
