export type LisPhase =
  | "init"
  | "visit"
  | "compare"
  | "update"
  | "skip"
  | "best"
  | "reconstruct"
  | "done";

export type LisState = {
  values: number[];
  dp: number[];
  prev: (number | null)[];
  bestIndex: number | null;
  currentIndex: number | null;
  compareIndex: number | null;
  sequence: number[];
  activePair: { from: number; to: number } | null;
  phase: LisPhase;
};
