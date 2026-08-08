export type AlgorithmVisualizerCommand = {
  key: string | null;
  method: string;
  args: readonly unknown[];
};

export type AlgorithmVisualizerFrame = {
  index: number;
  lineNumber: number | null;
  commands: AlgorithmVisualizerCommand[];
  graph: AlgorithmVisualizerGraphState | null;
  logs: string[];
};

export type AlgorithmVisualizerGraphNode = {
  id: string | number;
  weight: unknown;
  x: number;
  y: number;
  visitedCount: number;
  selectedCount: number;
};

export type AlgorithmVisualizerGraphEdge = {
  source: string | number;
  target: string | number;
  weight: unknown;
  visitedCount: number;
  selectedCount: number;
};

export type AlgorithmVisualizerGraphState = {
  title: string;
  isDirected: boolean;
  isWeighted: boolean;
  nodes: AlgorithmVisualizerGraphNode[];
  edges: AlgorithmVisualizerGraphEdge[];
};

type MutableTracer =
  | { className: "GraphTracer"; title: string; graph: AlgorithmVisualizerGraphState }
  | { className: "LogTracer"; title: string; text: string };

type MutableReplayState = {
  objects: Map<string, MutableTracer>;
  rootKey: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNodeId(value: unknown): value is string | number {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function requireNodeId(value: unknown, description: string): string | number {
  if (!isNodeId(value)) throw new Error(`${description} must be a finite number or string`);
  return value;
}

function optionalNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalCount(value: unknown): number {
  return Number.isInteger(value) && typeof value === "number" ? value : 0;
}

function createGraph(title: string): AlgorithmVisualizerGraphState {
  return {
    title,
    isDirected: true,
    isWeighted: false,
    nodes: [],
    edges: [],
  };
}

function cloneGraph(graph: AlgorithmVisualizerGraphState): AlgorithmVisualizerGraphState {
  return {
    title: graph.title,
    isDirected: graph.isDirected,
    isWeighted: graph.isWeighted,
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

function sameId(left: string | number, right: string | number): boolean {
  return left === right;
}

function findNode(graph: AlgorithmVisualizerGraphState, id: string | number): AlgorithmVisualizerGraphNode | undefined {
  return graph.nodes.find((node) => sameId(node.id, id));
}

function findEdge(
  graph: AlgorithmVisualizerGraphState,
  source: string | number,
  target: string | number,
): AlgorithmVisualizerGraphEdge | undefined {
  return graph.edges.find((edge) => {
    if (graph.isDirected) return sameId(edge.source, source) && sameId(edge.target, target);
    return (sameId(edge.source, source) && sameId(edge.target, target))
      || (sameId(edge.source, target) && sameId(edge.target, source));
  });
}

function parseCommand(value: unknown, index: number): AlgorithmVisualizerCommand {
  if (!isRecord(value)) throw new Error(`Algorithm Visualizer command ${index} must be an object`);

  const key = value.key;
  if (key !== null && typeof key !== "string") {
    throw new Error(`Algorithm Visualizer command ${index} key must be a string or null`);
  }

  if (typeof value.method !== "string" || value.method.trim().length === 0) {
    throw new Error(`Algorithm Visualizer command ${index} method must not be empty`);
  }

  if (!Array.isArray(value.args)) {
    throw new Error(`Algorithm Visualizer command ${index} args must be an array`);
  }

  return { key, method: value.method, args: [...value.args] };
}

export function importAlgorithmVisualizerCommands(value: unknown): AlgorithmVisualizerCommand[] {
  if (!Array.isArray(value)) throw new Error("Algorithm Visualizer artifact must be an array of commands");
  return value.map(parseCommand);
}

export function splitAlgorithmVisualizerFrames(
  commands: readonly AlgorithmVisualizerCommand[],
): Array<{ index: number; lineNumber: number | null; commands: AlgorithmVisualizerCommand[] }> {
  const imported = importAlgorithmVisualizerCommands(commands);
  const frameCommands: AlgorithmVisualizerCommand[][] = [[]];
  const lineNumbers: Array<number | null> = [null];

  for (const command of imported) {
    if (command.key === null && command.method === "delay") {
      const lineNumber = command.args[0];
      if (lineNumber !== undefined && (!Number.isInteger(lineNumber) || (lineNumber as number) <= 0)) {
        throw new Error("Algorithm Visualizer delay line number must be a positive integer");
      }
      lineNumbers[lineNumbers.length - 1] = lineNumber === undefined ? null : lineNumber as number;
      frameCommands.push([]);
      lineNumbers.push(null);
      continue;
    }
    frameCommands[frameCommands.length - 1].push(command);
  }

  return frameCommands.map((frame, index) => ({
    index,
    lineNumber: lineNumbers[index],
    commands: frame,
  }));
}

function requireTracer(state: MutableReplayState, key: string | null): MutableTracer {
  if (key === null) throw new Error("Algorithm Visualizer command requires a tracer key");
  const tracer = state.objects.get(key);
  if (!tracer) throw new Error(`Algorithm Visualizer tracer does not exist: ${key}`);
  return tracer;
}

function applyGraphCommand(graph: AlgorithmVisualizerGraphState, method: string, args: readonly unknown[]): void {
  if (method === "directed") {
    graph.isDirected = args[0] === undefined ? true : Boolean(args[0]);
    return;
  }
  if (method === "weighted") {
    graph.isWeighted = args[0] === undefined ? true : Boolean(args[0]);
    return;
  }
  if (method === "reset") {
    graph.nodes = [];
    graph.edges = [];
    return;
  }
  if (method === "set") {
    const matrix = args[0];
    if (!Array.isArray(matrix)) throw new Error("GraphTracer set expects an adjacency matrix");
    graph.nodes = matrix.map((_, id) => ({ id, weight: null, x: 0, y: 0, visitedCount: 0, selectedCount: 0 }));
    graph.edges = [];
    for (let source = 0; source < matrix.length; source += 1) {
      const row = matrix[source];
      if (!Array.isArray(row)) throw new Error("GraphTracer adjacency matrix rows must be arrays");
      for (let target = 0; target < row.length; target += 1) {
        if (row[target]) graph.edges.push({ source, target, weight: graph.isWeighted ? row[target] : null, visitedCount: 0, selectedCount: 0 });
      }
    }
    return;
  }
  if (method === "addNode") {
    const id = requireNodeId(args[0], "GraphTracer node id");
    if (findNode(graph, id)) return;
    graph.nodes.push({
      id,
      weight: args[1] ?? null,
      x: optionalNumber(args[2], 0),
      y: optionalNumber(args[3], 0),
      visitedCount: optionalCount(args[4]),
      selectedCount: optionalCount(args[5]),
    });
    return;
  }
  if (method === "updateNode") {
    const node = findNode(graph, requireNodeId(args[0], "GraphTracer node id"));
    if (!node) throw new Error("GraphTracer updateNode target does not exist");
    if (args[1] !== undefined) node.weight = args[1];
    if (args[2] !== undefined) node.x = optionalNumber(args[2], node.x);
    if (args[3] !== undefined) node.y = optionalNumber(args[3], node.y);
    if (args[4] !== undefined) node.visitedCount = optionalCount(args[4]);
    if (args[5] !== undefined) node.selectedCount = optionalCount(args[5]);
    return;
  }
  if (method === "removeNode") {
    const id = requireNodeId(args[0], "GraphTracer node id");
    graph.nodes = graph.nodes.filter((node) => !sameId(node.id, id));
    graph.edges = graph.edges.filter((edge) => !sameId(edge.source, id) && !sameId(edge.target, id));
    return;
  }
  if (method === "addEdge") {
    const source = requireNodeId(args[0], "GraphTracer edge source");
    const target = requireNodeId(args[1], "GraphTracer edge target");
    if (findEdge(graph, source, target)) return;
    graph.edges.push({
      source,
      target,
      weight: args[2] ?? null,
      visitedCount: optionalCount(args[3]),
      selectedCount: optionalCount(args[4]),
    });
    return;
  }
  if (method === "updateEdge") {
    const edge = findEdge(graph, requireNodeId(args[0], "GraphTracer edge source"), requireNodeId(args[1], "GraphTracer edge target"));
    if (!edge) throw new Error("GraphTracer updateEdge target does not exist");
    if (args[2] !== undefined) edge.weight = args[2];
    if (args[3] !== undefined) edge.visitedCount = optionalCount(args[3]);
    if (args[4] !== undefined) edge.selectedCount = optionalCount(args[4]);
    return;
  }
  if (method === "removeEdge") {
    const source = requireNodeId(args[0], "GraphTracer edge source");
    const target = requireNodeId(args[1], "GraphTracer edge target");
    graph.edges = graph.edges.filter((edge) => !(sameId(edge.source, source) && sameId(edge.target, target)));
    return;
  }
  if (method === "visit" || method === "leave" || method === "select" || method === "deselect") {
    const target = requireNodeId(args[0], "GraphTracer node id");
    const source = args[1] === undefined || args[1] === null ? null : requireNodeId(args[1], "GraphTracer edge source");
    const node = findNode(graph, target);
    if (!node) throw new Error(`GraphTracer target node does not exist: ${String(target)}`);
    const edge = source === null ? undefined : findEdge(graph, source, target);
    const delta = method === "visit" || method === "select" ? 1 : -1;
    const property = method === "visit" || method === "leave" ? "visitedCount" : "selectedCount";
    node[property] += delta;
    if (edge) edge[property] += delta;
    if (method === "visit" && args[2] !== undefined) node.weight = args[2];
    return;
  }
  if (method === "layoutCircle") {
    const radius = 128;
    const step = (Math.PI * 2) / Math.max(graph.nodes.length, 1);
    graph.nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + step * index;
      node.x = Math.round(Math.cos(angle) * radius);
      node.y = Math.round(Math.sin(angle) * radius);
    });
    return;
  }
  if (method === "layoutRandom" || method === "layoutTree" || method === "log") return;
  throw new Error(`Unsupported GraphTracer command: ${method}`);
}

function applyLogCommand(log: { text: string }, method: string, args: readonly unknown[]): void {
  if (method === "set") {
    log.text = String(args[0] ?? "");
    return;
  }
  if (method === "print" || method === "println") {
    log.text += String(args[0] ?? "") + (method === "println" ? "\n" : "");
    return;
  }
  if (method === "printf") {
    log.text += String(args[0] ?? "");
    return;
  }
  if (method === "reset") return;
  throw new Error(`Unsupported LogTracer command: ${method}`);
}

function applyCommand(state: MutableReplayState, command: AlgorithmVisualizerCommand): void {
  if (command.key === null && command.method === "setRoot") {
    const rootKey = command.args[0];
    if (typeof rootKey !== "string") throw new Error("Algorithm Visualizer setRoot expects a tracer key");
    state.rootKey = rootKey;
    return;
  }
  if (command.method === "destroy") {
    if (command.key !== null) state.objects.delete(command.key);
    return;
  }
  if (command.method === "GraphTracer") {
    if (command.key === null) throw new Error("GraphTracer must have an object key");
    state.objects.set(command.key, { className: "GraphTracer", title: String(command.args[0] ?? "Graph"), graph: createGraph(String(command.args[0] ?? "Graph")) });
    return;
  }
  if (command.method === "LogTracer") {
    if (command.key === null) throw new Error("LogTracer must have an object key");
    state.objects.set(command.key, { className: "LogTracer", title: String(command.args[0] ?? "Log"), text: "" });
    return;
  }

  const tracer = requireTracer(state, command.key);
  if (tracer.className === "GraphTracer") {
    applyGraphCommand(tracer.graph, command.method, command.args);
  } else {
    applyLogCommand(tracer, command.method, command.args);
  }
}

function snapshotLogs(state: MutableReplayState): string[] {
  const logs: string[] = [];
  for (const tracer of state.objects.values()) {
    if (tracer.className !== "LogTracer") continue;
    logs.push(...tracer.text.split("\n").filter((line) => line.length > 0));
  }
  return logs;
}

function snapshotGraph(state: MutableReplayState): AlgorithmVisualizerGraphState | null {
  const root = state.rootKey === null ? undefined : state.objects.get(state.rootKey);
  if (root?.className === "GraphTracer") return cloneGraph(root.graph);
  for (const tracer of state.objects.values()) {
    if (tracer.className === "GraphTracer") return cloneGraph(tracer.graph);
  }
  return null;
}

export function replayAlgorithmVisualizerCommands(
  commands: readonly AlgorithmVisualizerCommand[],
): AlgorithmVisualizerFrame[] {
  const state: MutableReplayState = { objects: new Map(), rootKey: null };
  return splitAlgorithmVisualizerFrames(commands).map((frame) => {
    frame.commands.forEach((command) => applyCommand(state, command));
    return {
      index: frame.index,
      lineNumber: frame.lineNumber,
      commands: frame.commands.map((command) => ({ ...command, args: [...command.args] })),
      graph: snapshotGraph(state),
      logs: snapshotLogs(state),
    };
  });
}
