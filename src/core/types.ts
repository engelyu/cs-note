export type FocusTarget =
  | { kind: "entity"; id: string }
  | { kind: "event"; id: string }
  | { kind: "concept"; id: string };

export type ExecutionEvent = {
  id: string;
  phase: string;
  label: string;
  detail: string;
  focus?: FocusTarget;
};

export type ExecutionFrame<State> = {
  index: number;
  event: ExecutionEvent;
  state: State;
  changedIds: string[];
};

export type ViewSpec = {
  id: string;
  label: string;
  kind: "canvas" | "panel";
};

export type VisualizationScenario<State> = {
  id: string;
  title: string;
  description: string;
  frames: ExecutionFrame<State>[];
};

export type VisualizationPackage<State> = {
  id: string;
  title: string;
  category: string;
  schemaVersion: 1;
  views: ViewSpec[];
  scenarios: VisualizationScenario<State>[];
  capabilities: {
    toggleView: boolean;
    editLayout: boolean;
    editInput: boolean;
    rerun: boolean;
  };
};

export type LayoutRect = { x: number; y: number; width: number; height: number };
