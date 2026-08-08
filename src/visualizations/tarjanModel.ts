export type GraphEdge = { from: number; to: number };

export type TarjanPhase =
  | "init"
  | "visit"
  | "tree-edge"
  | "return"
  | "back-edge"
  | "cross-edge"
  | "root"
  | "pop-scc"
  | "wait"
  | "done";

export type TarjanState = {
  labels: string[];
  edges: GraphEdge[];
  disc: number[];
  low: number[];
  onStack: boolean[];
  stack: number[];
  callStack: number[];
  components: number[][];
  current: number | null;
  activeEdge: GraphEdge | null;
  phase: TarjanPhase;
};
