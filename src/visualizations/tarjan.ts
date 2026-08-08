import type { ExecutionFrame, ExecutionEvent } from "../core/types";
import type { GraphEdge, TarjanState } from "./tarjanModel";

export type { GraphEdge, TarjanState } from "./tarjanModel";

const LABELS = ["A", "B", "C", "D", "E"];
const EDGES: GraphEdge[] = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 0 },
  { from: 1, to: 3 },
  { from: 3, to: 4 },
];

function snapshot(state: TarjanState): TarjanState {
  return {
    labels: [...state.labels],
    edges: state.edges.map((edge) => ({ ...edge })),
    disc: [...state.disc],
    low: [...state.low],
    onStack: [...state.onStack],
    stack: [...state.stack],
    components: state.components.map((component) => [...component]),
    current: state.current,
    activeEdge: state.activeEdge ? { ...state.activeEdge } : null,
    phase: state.phase,
  };
}

export function createTarjanFrames(): ExecutionFrame<TarjanState>[] {
  const state: TarjanState = {
    labels: LABELS,
    edges: EDGES,
    disc: LABELS.map(() => -1),
    low: LABELS.map(() => -1),
    onStack: LABELS.map(() => false),
    stack: [],
    components: [],
    current: null,
    activeEdge: null,
    phase: "init",
  };
  const frames: ExecutionFrame<TarjanState>[] = [];
  let time = 0;

  const emit = (
    phase: string,
    label: string,
    detail: string,
    changedIds: string[] = [],
    focus?: ExecutionEvent["focus"],
  ) => {
    const event: ExecutionEvent = {
      id: `tarjan-${frames.length}`,
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
    "Start DFS",
    "Tarjan finds strongly connected components with one depth-first search.",
  );

  const adjacency = LABELS.map(() => [] as number[]);
  for (const edge of EDGES) adjacency[edge.from].push(edge.to);

  const dfs = (u: number) => {
    state.disc[u] = time;
    state.low[u] = time;
    time += 1;
    state.stack.push(u);
    state.onStack[u] = true;
    state.current = u;
    state.activeEdge = null;
    state.phase = "visit";
    emit(
      "visit",
      `Visit ${LABELS[u]}`,
      `Set disc[${LABELS[u]}] = low[${LABELS[u]}] = ${state.disc[u]}, then push ${LABELS[u]} onto the stack.`,
      [`node:${LABELS[u]}`],
      { kind: "entity", id: `node:${LABELS[u]}` },
    );

    for (const v of adjacency[u]) {
      state.current = u;
      state.activeEdge = { from: u, to: v };
      if (state.disc[v] === -1) {
        state.phase = "tree-edge";
        emit(
          "tree-edge",
          `${LABELS[u]} → ${LABELS[v]}`,
          `${LABELS[v]} is unvisited, so this is a tree edge. Recurse into ${LABELS[v]}.`,
          [`edge:${u}-${v}`],
          { kind: "entity", id: `edge:${u}-${v}` },
        );
        dfs(v);
        const before = state.low[u];
        state.low[u] = Math.min(state.low[u], state.low[v]);
        state.phase = "return";
        emit(
          "return",
          `Return to ${LABELS[u]}`,
          `low[${LABELS[u]}] = min(${before}, low[${LABELS[v]}] = ${state.low[v]}) = ${state.low[u]}.`,
          [`node:${LABELS[u]}`],
          { kind: "entity", id: `node:${LABELS[u]}` },
        );
      } else if (state.onStack[v]) {
        const before = state.low[u];
        state.low[u] = Math.min(state.low[u], state.disc[v]);
        state.phase = "back-edge";
        emit(
          "back-edge",
          `Back edge ${LABELS[u]} → ${LABELS[v]}`,
          `${LABELS[v]} is still on the stack, so low[${LABELS[u]}] can use disc[${LABELS[v]}] = ${state.disc[v]} instead of low[${LABELS[v]}].`,
          state.low[u] !== before ? [`node:${LABELS[u]}`] : [],
          { kind: "entity", id: `edge:${u}-${v}` },
        );
      } else {
        state.phase = "cross-edge";
        emit(
          "cross-edge",
          `Ignore ${LABELS[u]} → ${LABELS[v]}`,
          `${LABELS[v]} already belongs to a finished component, so this edge cannot lower low[${LABELS[u]}].`,
          [],
          { kind: "entity", id: `edge:${u}-${v}` },
        );
      }
    }

    state.current = u;
    state.activeEdge = null;
    if (state.low[u] === state.disc[u]) {
      state.phase = "root";
      emit(
        "root",
        `${LABELS[u]} closes an SCC`,
        `low[${LABELS[u]}] === disc[${LABELS[u]}] === ${state.disc[u]}, so ${LABELS[u]} is an SCC root.`,
        [`node:${LABELS[u]}`],
        { kind: "concept", id: "scc-root" },
      );
      const component: number[] = [];
      let w = -1;
      while (w !== u) {
        w = state.stack.pop() as number;
        state.onStack[w] = false;
        component.push(w);
      }
      component.sort((a, b) => a - b);
      state.components.push(component);
      state.phase = "pop-scc";
      emit(
        "scc",
        `Found {${component.map((member) => LABELS[member]).join(", ")}}`,
        `Pop the stack until ${LABELS[u]}. This is strongly connected component #${state.components.length}.`,
        component.map((member) => `node:${LABELS[member]}`),
        { kind: "concept", id: "scc" },
      );
    } else {
      state.phase = "wait";
      emit(
        "wait",
        `Keep ${LABELS[u]} on stack`,
        `low[${LABELS[u]}] = ${state.low[u]} is earlier than disc[${LABELS[u]}] = ${state.disc[u]}, so the outer call decides when it closes.`,
        [`node:${LABELS[u]}`],
        { kind: "entity", id: `node:${LABELS[u]}` },
      );
    }
  };

  for (let root = 0; root < LABELS.length; root += 1) {
    if (state.disc[root] === -1) dfs(root);
  }

  state.current = null;
  state.phase = "done";
  emit(
    "done",
    "Complete",
    `Found ${state.components.length} strongly connected components in O(V + E).`,
    [],
    { kind: "concept", id: "scc" },
  );
  return frames;
}
