import artifact from "./lisArtifact.json" with { type: "json" };
import type { ExecutionEvent, ExecutionFrame, FocusTarget, VisualizationPackage } from "../core/types";
import type { LisPhase, LisState } from "./lisModel";

type LisArtifact = {
  artifactVersion: 1;
  packageId: "lis-dp";
  scenarioId: "classic-sequence";
  frames: ExecutionFrame<LisState>[];
};

const LIS_PHASES = new Set<LisPhase>(["init", "visit", "compare", "update", "skip", "best", "reconstruct", "done"]);
const CONCEPT_IDS = new Set(["dp", "predecessor", "best", "reconstruct"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIndex(value: unknown, length: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
}

function isFocusTarget(value: unknown): value is FocusTarget {
  return isRecord(value) && (value.kind === "entity" || value.kind === "event" || value.kind === "concept") && typeof value.id === "string";
}

function isExecutionEvent(value: unknown): value is ExecutionEvent {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.phase === "string"
    && LIS_PHASES.has(value.phase as LisPhase)
    && typeof value.label === "string"
    && typeof value.detail === "string"
    && (value.focus === undefined || isFocusTarget(value.focus));
}

function isLisState(value: unknown): value is LisState {
  if (!isRecord(value) || !Array.isArray(value.values) || !value.values.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return false;
  const length = value.values.length;
  const { dp, prev, bestIndex, currentIndex, compareIndex, sequence, activePair, phase } = value;
  if (!Array.isArray(dp) || !Array.isArray(prev) || dp.length !== length || prev.length !== length) return false;
  if (!dp.every((entry) => typeof entry === "number" && Number.isInteger(entry) && entry >= 1)) return false;
  if (!prev.every((entry) => entry === null || isIndex(entry, length))) return false;
  if (bestIndex !== null && !isIndex(bestIndex, length)) return false;
  if (currentIndex !== null && !isIndex(currentIndex, length)) return false;
  if (compareIndex !== null && !isIndex(compareIndex, length)) return false;
  if (!Array.isArray(sequence) || !sequence.every((entry) => isIndex(entry, length))) return false;
  if (new Set(sequence).size !== sequence.length) return false;
  if (!sequence.every((entry, index) => index === 0 || sequence[index - 1] < entry)) return false;
  if (activePair !== null && (!isRecord(activePair)
    || !isIndex(activePair.from, length)
    || !isIndex(activePair.to, length)
    || activePair.from >= activePair.to)) return false;
  return typeof phase === "string" && LIS_PHASES.has(phase as LisPhase);
}

function isExecutionFrame(value: unknown): value is ExecutionFrame<LisState> {
  return isRecord(value)
    && Number.isInteger(value.index)
    && isExecutionEvent(value.event)
    && isLisState(value.state)
    && Array.isArray(value.changedIds)
    && value.changedIds.every((id) => typeof id === "string");
}

function isValidArtifactShape(candidate: LisArtifact): boolean {
  if (candidate.frames.length === 0) return false;
  const firstState = candidate.frames[0].state;
  const entityIds = new Set([
    ...firstState.values.map((_, index) => `cell:${index}`),
    ...firstState.values.flatMap((_, to) => firstState.values.slice(0, to).map((__, from) => `link:${from}-${to}`)),
  ]);
  const eventIds = new Set<string>();

  for (const [index, frame] of candidate.frames.entries()) {
    if (frame.index !== index || eventIds.has(frame.event.id)) return false;
    eventIds.add(frame.event.id);
    if (frame.state.values.join(",") !== firstState.values.join(",")) return false;
    if (!frame.changedIds.every((id) => entityIds.has(id))) return false;
    if (frame.event.focus) {
      if (frame.event.focus.kind === "entity" && !entityIds.has(frame.event.focus.id)) return false;
      if (frame.event.focus.kind === "concept" && !CONCEPT_IDS.has(frame.event.focus.id)) return false;
      if (frame.event.focus.kind === "event" && !eventIds.has(frame.event.focus.id)) return false;
    }
  }
  return true;
}

export function isValidLisArtifact(value: unknown): value is LisArtifact {
  return isRecord(value)
    && value.artifactVersion === 1
    && value.packageId === "lis-dp"
    && value.scenarioId === "classic-sequence"
    && Array.isArray(value.frames)
    && value.frames.every(isExecutionFrame)
    && isValidArtifactShape(value as LisArtifact);
}

if (!isValidLisArtifact(artifact)) throw new Error("Invalid LIS semantic artifact");

const frames = artifact.frames;

export const lisPackage: VisualizationPackage<LisState> = {
  id: artifact.packageId,
  title: "Longest Increasing Subsequence",
  category: "Algorithms",
  schemaVersion: 1,
  views: [
    { id: "sequence", label: "Sequence", kind: "canvas" },
    { id: "variables", label: "Variables", kind: "panel" },
    { id: "concepts", label: "Concepts", kind: "panel" },
    { id: "timeline", label: "Timeline", kind: "panel" },
  ],
  scenarios: [
    {
      id: artifact.scenarioId,
      title: "Classic sequence",
      description: "A compact sequence that exposes comparisons, predecessor updates, and reconstruction.",
      frames,
      capabilities: { toggleView: true, editLayout: true, editInput: false, rerun: false },
    },
  ],
};
