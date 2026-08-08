import artifact from "./tarjanArtifact.json" with { type: "json" };
import type { ExecutionEvent, ExecutionFrame, FocusTarget, VisualizationPackage } from "../core/types";
import type { GraphEdge, TarjanState } from "./tarjanModel";

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

function isFocusTarget(value: unknown): value is FocusTarget {
  return isRecord(value)
    && (value.kind === "entity" || value.kind === "event" || value.kind === "concept")
    && typeof value.id === "string";
}

function isExecutionEvent(value: unknown): value is ExecutionEvent {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.phase === "string"
    && typeof value.label === "string"
    && typeof value.detail === "string"
    && (value.focus === undefined || isFocusTarget(value.focus));
}

function isTarjanState(value: unknown): value is TarjanState {
  return isRecord(value)
    && Array.isArray(value.labels) && value.labels.every((label) => typeof label === "string")
    && Array.isArray(value.edges) && value.edges.every(isGraphEdge)
    && Array.isArray(value.disc) && value.disc.every((entry) => Number.isInteger(entry))
    && Array.isArray(value.low) && value.low.every((entry) => Number.isInteger(entry))
    && Array.isArray(value.onStack) && value.onStack.every((entry) => typeof entry === "boolean")
    && Array.isArray(value.stack) && value.stack.every((entry) => Number.isInteger(entry))
    && Array.isArray(value.components) && value.components.every((component) => Array.isArray(component) && component.every((entry) => Number.isInteger(entry)))
    && (value.current === null || Number.isInteger(value.current))
    && (value.activeEdge === null || isGraphEdge(value.activeEdge))
    && typeof value.phase === "string";
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

if (!isTarjanArtifact(artifact)) {
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
