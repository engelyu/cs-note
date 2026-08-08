import type { ExecutionEvent, ExecutionFrame } from "../core/types";
import type { LisState, LisPhase } from "./lisModel";

export type { LisPhase, LisState } from "./lisModel";

const VALUES = [10, 22, 9, 33, 21, 50, 41, 60];

function snapshot(state: LisState): LisState {
  return {
    values: [...state.values],
    dp: [...state.dp],
    prev: [...state.prev],
    bestIndex: state.bestIndex,
    currentIndex: state.currentIndex,
    compareIndex: state.compareIndex,
    sequence: [...state.sequence],
    activePair: state.activePair ? { ...state.activePair } : null,
    phase: state.phase,
  };
}

export function createLisFrames(): ExecutionFrame<LisState>[] {
  const state: LisState = {
    values: [...VALUES],
    dp: VALUES.map(() => 1),
    prev: VALUES.map(() => null),
    bestIndex: null,
    currentIndex: null,
    compareIndex: null,
    sequence: [],
    activePair: null,
    phase: "init",
  };
  const frames: ExecutionFrame<LisState>[] = [];

  const emit = (
    phase: LisPhase,
    label: string,
    detail: string,
    changedIds: string[] = [],
    focus?: ExecutionEvent["focus"],
  ) => {
    state.phase = phase;
    const event: ExecutionEvent = {
      id: `lis-${frames.length}`,
      phase,
      label,
      detail,
      ...(focus ? { focus } : {}),
    };
    frames.push({
      index: frames.length,
      event,
      state: snapshot(state),
      changedIds,
    });
  };

  emit(
    "init",
    "Start dynamic programming",
    "For every position i, dp[i] stores the longest increasing subsequence that ends at i.",
    [],
    { kind: "concept", id: "dp" },
  );

  for (let i = 0; i < state.values.length; i += 1) {
    state.currentIndex = i;
    state.compareIndex = null;
    state.activePair = null;
    emit(
      "visit",
      `Consider a[${i}] = ${state.values[i]}`,
      `Start with dp[${i}] = 1: the value itself is an increasing subsequence of length one.`,
      [`cell:${i}`],
      { kind: "entity", id: `cell:${i}` },
    );

    for (let j = 0; j < i; j += 1) {
      state.compareIndex = j;
      state.activePair = { from: j, to: i };
      emit(
        "compare",
        `Compare a[${j}] with a[${i}]`,
        `Check whether a[${j}] = ${state.values[j]} can precede a[${i}] = ${state.values[i]}.`,
        [`cell:${j}`, `cell:${i}`],
        { kind: "entity", id: `cell:${i}` },
      );
      if (state.values[j] < state.values[i]) {
        const candidate = state.dp[j] + 1;
        if (candidate > state.dp[i]) {
          const before = state.dp[i];
          state.dp[i] = candidate;
          state.prev[i] = j;
          emit(
            "update",
            `Extend from a[${j}] to a[${i}]`,
            `a[${j}] = ${state.values[j]} < ${state.values[i]}, so dp[${i}] becomes max(${before}, dp[${j}] + 1) = ${candidate}.`,
            [`cell:${j}`, `cell:${i}`, `link:${j}-${i}`],
            { kind: "concept", id: "predecessor" },
          );
        } else {
          emit(
            "skip",
            `Keep dp[${i}] = ${state.dp[i]}`,
            `a[${j}] < a[${i}], but dp[${j}] + 1 = ${candidate} does not improve the current value.`,
            [`cell:${j}`, `cell:${i}`],
            { kind: "entity", id: `cell:${i}` },
          );
        }
      } else {
        emit(
          "skip",
          `Skip a[${j}] as a predecessor`,
          `a[${j}] = ${state.values[j]} is not smaller than ${state.values[i]}, so this pair cannot be increasing.`,
          [`cell:${j}`, `cell:${i}`],
          { kind: "entity", id: `cell:${i}` },
        );
      }
    }

    state.compareIndex = null;
    state.activePair = null;
    if (state.bestIndex === null || state.dp[i] > state.dp[state.bestIndex]) {
      state.bestIndex = i;
      emit(
        "best",
        `Best length is ${state.dp[i]}`,
        `The longest subsequence found so far ends at a[${i}] = ${state.values[i]}.`,
        [`cell:${i}`],
        { kind: "concept", id: "best" },
      );
    } else {
      emit(
        "best",
        `Best stays ${state.dp[state.bestIndex]}`,
        `a[${i}] ends a subsequence of length ${state.dp[i]}, so the global best does not change.`,
        [`cell:${i}`],
        { kind: "concept", id: "best" },
      );
    }
  }

  state.currentIndex = state.bestIndex;
  state.sequence = [];
  let cursor = state.bestIndex;
  while (cursor !== null) {
    state.sequence.unshift(cursor);
    emit(
      "reconstruct",
      `Select a[${cursor}] = ${state.values[cursor]}`,
      `Follow prev[${cursor}] to reconstruct one longest increasing subsequence.`,
      [`cell:${cursor}`],
      { kind: "concept", id: "reconstruct" },
    );
    cursor = state.prev[cursor];
    state.currentIndex = cursor;
  }

  state.currentIndex = null;
  emit(
    "done",
    `Complete: length ${state.sequence.length}`,
    `The reconstructed subsequence is [${state.sequence.map((index) => state.values[index]).join(", ")}]. The O(n²) dynamic program is complete.`,
    state.sequence.map((index) => `cell:${index}`),
    { kind: "concept", id: "reconstruct" },
  );
  return frames;
}
