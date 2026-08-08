import artifact from "./tarjanArtifact.json" with { type: "json" };
import type { ExecutionEvent, ExecutionFrame, FocusTarget, VisualizationPackage } from "../core/types";
import type { GraphEdge, TarjanPhase, TarjanState } from "./tarjanModel";

type TarjanArtifact = {
  artifactVersion: 1;
  packageId: string;
  scenarioId: string;
  frames: ExecutionFrame<TarjanState>[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGraphEdge(value: unknown): value is GraphEdge {
  return isRecord(value) && Number.isInteger(value.from) && Number.isInteger(value.to);
}

const TARJAN_PHASES = new Set<TarjanPhase>([
  "init",
  "visit",
  "tree-edge",
  "return",
  "back-edge",
  "cross-edge",
  "root",
  "pop-scc",
  "wait",
  "done",
]);

const EVENT_PHASES = new Set([
  ...TARJAN_PHASES,
  "scc",
]);

const CONCEPT_IDS = new Set(["scc-root", "scc"]);

function isTarjanPhase(value: unknown): value is TarjanPhase {
  return typeof value === "string" && TARJAN_PHASES.has(value as TarjanPhase);
}

function isEventPhase(value: unknown): value is string {
  return typeof value === "string" && EVENT_PHASES.has(value);
}

function isVertexIndex(value: unknown, vertexCount: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < vertexCount;
}

function isFocusTarget(value: unknown): value is FocusTarget {
  return isRecord(value)
    && (value.kind === "entity" || value.kind === "event" || value.kind === "concept")
    && typeof value.id === "string";
}

function isExecutionEvent(value: unknown): value is ExecutionEvent {
  return isRecord(value)
    && typeof value.id === "string"
    && isEventPhase(value.phase)
    && typeof value.label === "string"
    && typeof value.detail === "string"
    && (value.focus === undefined || isFocusTarget(value.focus));
}

function isTarjanState(value: unknown): value is TarjanState {
  if (!isRecord(value) || !Array.isArray(value.labels) || !value.labels.every((label) => typeof label === "string")) {
    return false;
  }

  const vertexCount = value.labels.length;
  const { disc, low, onStack, edges, stack, callStack, components, current, activeEdge, phase } = value;
  if (!Array.isArray(disc) || !Array.isArray(low) || !Array.isArray(onStack)
    || disc.length !== vertexCount || low.length !== vertexCount || onStack.length !== vertexCount) return false;
  if (!disc.every((entry) => Number.isInteger(entry) && entry >= -1)) return false;
  if (!low.every((entry) => Number.isInteger(entry) && entry >= -1)) return false;
  if (!onStack.every((entry) => typeof entry === "boolean")) return false;
  if (!Array.isArray(edges) || !edges.every((edge) => isGraphEdge(edge)
    && isVertexIndex(edge.from, vertexCount)
    && isVertexIndex(edge.to, vertexCount))) return false;
  if (!Array.isArray(stack) || !stack.every((entry) => isVertexIndex(entry, vertexCount))) return false;
  if (!Array.isArray(callStack) || !callStack.every((entry) => isVertexIndex(entry, vertexCount))) return false;
  if (new Set(stack).size !== stack.length || new Set(callStack).size !== callStack.length) return false;
  const stackSet = new Set(stack);
  if (onStack.some((onStack, index) => onStack !== stackSet.has(index))) return false;
  if (!Array.isArray(components)) return false;

  const componentMembers = new Set<number>();
  for (const component of components) {
    if (!Array.isArray(component) || !component.every((entry) => isVertexIndex(entry, vertexCount))) return false;
    for (const entry of component) {
      if (componentMembers.has(entry) || stackSet.has(entry)) return false;
      componentMembers.add(entry);
    }
  }

  return (current === null || isVertexIndex(current, vertexCount))
    && (activeEdge === null || (isGraphEdge(activeEdge)
      && isVertexIndex(activeEdge.from, vertexCount)
      && isVertexIndex(activeEdge.to, vertexCount)))
    && isTarjanPhase(phase);
}

function isExecutionFrame(value: unknown): value is ExecutionFrame<TarjanState> {
  return isRecord(value)
    && Number.isInteger(value.index)
    && isExecutionEvent(value.event)
    && isTarjanState(value.state)
    && Array.isArray(value.changedIds)
    && value.changedIds.every((id) => typeof id === "string");
}

function isTarjanArtifact(value: unknown): value is TarjanArtifact {
  return isRecord(value)
    && value.artifactVersion === 1
    && value.packageId === "tarjan-scc"
    && value.scenarioId === "simple-cycle"
    && Array.isArray(value.frames)
    && value.frames.every(isExecutionFrame);
}

function isValidTarjanArtifactShape(artifact: TarjanArtifact): boolean {
  if (artifact.frames.length === 0) return false;

  const eventIds = new Set<string>();
  const firstState = artifact.frames[0].state;
  const entityIds = new Set([
    ...firstState.labels.map((label) => `node:${label}`),
    ...firstState.edges.map((edge) => `edge:${edge.from}-${edge.to}`),
  ]);

  for (const [index, frame] of artifact.frames.entries()) {
    if (frame.index !== index || eventIds.has(frame.event.id)) return false;
    eventIds.add(frame.event.id);
    if (frame.state.labels.join("\u0000") !== firstState.labels.join("\u0000")) return false;
    if (JSON.stringify(frame.state.edges) !== JSON.stringify(firstState.edges)) return false;
    if (!frame.changedIds.every((id) => entityIds.has(id))) return false;
    if (frame.event.focus) {
      if (frame.event.focus.kind === "entity" && !entityIds.has(frame.event.focus.id)) return false;
      if (frame.event.focus.kind === "concept" && !CONCEPT_IDS.has(frame.event.focus.id)) return false;
      if (frame.event.focus.kind === "event" && !eventIds.has(frame.event.focus.id)) return false;
    }
  }

  return true;
}

export function isValidTarjanArtifact(value: unknown): value is TarjanArtifact {
  return isTarjanArtifact(value) && isValidTarjanArtifactShape(value);
}

if (!isValidTarjanArtifact(artifact)) {
  throw new Error("Invalid Tarjan semantic artifact");
}

const frames = artifact.frames;

export const tarjanPackage: VisualizationPackage<TarjanState> = {
  id: artifact.packageId,
  title: "Tarjan's Strongly Connected Components",
  category: "Algorithms",
  schemaVersion: 1,
  views: [
    { id: "graph", label: "Graph", kind: "canvas" },
    { id: "variables", label: "Variables", kind: "panel" },
    { id: "call-stack", label: "Call Stack", kind: "panel" },
    { id: "concepts", label: "Concepts", kind: "panel" },
    { id: "timeline", label: "Timeline", kind: "panel" },
  ],
  scenarios: [
    {
      id: artifact.scenarioId,
      title: "The simplest cycle",
      description: "A compact graph that exposes tree edges, a back edge, and three SCCs.",
      frames,
      capabilities: {
        toggleView: true,
        editLayout: true,
        editInput: false,
        rerun: false,
      },
    },
  ],
};
