import React, { useEffect, useMemo, useRef, useState } from "react";
import { convertToStableExcalidrawElements, Excalidraw } from "../excalidraw";
import type { LayoutRect } from "../core/types";
import {
  captureTarjanLayout,
  createTarjanSkeletons,
  isTarjanSceneSafe,
  type CanvasElementSnapshot,
} from "../visualizations/tarjanScene";
import { TARJAN_LAYOUT } from "../visualizations/tarjanLayout";
import { tarjanPackage } from "../visualizations/tarjanRuntime";
import {
  projectTarjanCallStack,
  projectTarjanConceptLabel,
  projectTarjanConcepts,
  projectTarjanTimeline,
  projectTarjanVariables,
} from "../visualizations/tarjanProjections";
import { isWebviewToHostMessage, type WebviewToHostMessage } from "../codeOss/protocol";

const tarjanScenario = tarjanPackage.scenarios[0];
const tarjanFrames = tarjanScenario.frames;
type TarjanFrame = (typeof tarjanFrames)[number];

export function normalizeTarjanLayout(value: unknown): Record<string, LayoutRect> {
  const message = {
    version: 1 as const,
    type: "layout-changed" as const,
    layout: value,
  };
  const persistedLayout = isWebviewToHostMessage(message) ? message.layout : {};
  return Object.fromEntries(
    Object.entries(TARJAN_LAYOUT).map(([id, rect]) => [id, { ...(persistedLayout[id] ?? rect) }]),
  ) as Record<string, LayoutRect>;
}

const layoutOnlyTools = {
  selection: true,
  hand: true,
  rectangle: false,
  diamond: false,
  ellipse: false,
  arrow: false,
  line: false,
  freedraw: false,
  text: false,
  image: false,
  eraser: false,
  frame: false,
  embeddable: false,
  laser: false,
};

type ExcalidrawApi = { updateScene: (scene: { elements: unknown[] }) => void };
type TarjanCanvasProps = {
  frame: TarjanFrame;
  elements: unknown[];
  layout: Record<string, LayoutRect>;
  initialSelectedIds: string[];
  onLayout: (layout: Record<string, LayoutRect>) => void;
  onSelection: (selectedIds: string[]) => void;
};

function isSafeLayout(value: unknown): value is Record<string, LayoutRect> {
  return isWebviewToHostMessage({ version: 1, type: "layout-changed", layout: value });
}

function layoutChanged(left: Record<string, LayoutRect>, right: Record<string, LayoutRect>): boolean {
  return Object.keys(right).some((id) => {
    const before = left[id];
    const after = right[id];
    return !before || before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
  });
}

function TarjanCanvas({ frame, elements, layout, initialSelectedIds, onLayout, onSelection }: TarjanCanvasProps): React.ReactElement {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);

  useEffect(() => {
    if (!apiRef.current) return;
    applyingSceneRef.current = true;
    apiRef.current.updateScene({ elements });
    const reset = window.setTimeout(() => {
      applyingSceneRef.current = false;
    }, 0);
    return () => window.clearTimeout(reset);
  }, [elements]);

  const handleCanvasChange = (nextElements: readonly unknown[], appState: unknown) => {
    const selectedElementIds = (appState as { selectedElementIds?: Record<string, boolean> }).selectedElementIds ?? {};
    onSelection(Object.keys(selectedElementIds).filter((id) => selectedElementIds[id] === true));
    if (applyingSceneRef.current) return;

    const snapshots = nextElements as CanvasElementSnapshot[];
    const capturedLayout = captureTarjanLayout(snapshots, layout);
    const acceptedLayout = isSafeLayout(capturedLayout) ? capturedLayout : layout;
    if (acceptedLayout !== layout && layoutChanged(layout, acceptedLayout)) onLayout(acceptedLayout);

    const canonical = convertToStableExcalidrawElements(
      createTarjanSkeletons(frame.state, acceptedLayout),
    ) as CanvasElementSnapshot[];
    if (!isTarjanSceneSafe(snapshots, canonical)) {
      applyingSceneRef.current = true;
      apiRef.current?.updateScene({ elements: canonical });
      window.setTimeout(() => {
        applyingSceneRef.current = false;
      }, 0);
    }
  };

  return (
    <div className="tarjan-canvas" aria-label="Algorithm canvas">
      <div className="canvas-grid" />
      <div className="canvas-breadcrumb"><span className="live-dot" /><span>GRAPH / TARJAN-SCC</span><b>FRAME {String(frame.index + 1).padStart(2, "0")}</b></div>
      <div className="excalidraw-host canvas-input-disabled">
        <Excalidraw
          initialData={{
            elements,
            appState: {
              viewBackgroundColor: "#17191f",
              selectedElementIds: Object.fromEntries(initialSelectedIds.map((id) => [id, true])),
            },
          }}
          theme="dark"
          excalidrawAPI={(api: unknown) => {
            apiRef.current = api as ExcalidrawApi;
          }}
          onChange={handleCanvasChange}
          UIOptions={{
            tools: layoutOnlyTools,
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
              saveAsImage: false,
              export: false,
            },
          }}
        />
      </div>
      <div className="canvas-legend"><span><i className="legend-swatch on-stack" />On stack</span><span><i className="legend-swatch component" />SCC</span><span><i className="legend-ring" />Current</span></div>
      <div className="canvas-hint">Only node layout edits persist; graph and algorithm edits are restored</div>
    </div>
  );
}

function ExplainStrip({ frame }: { frame: TarjanFrame }): React.ReactElement {
  return (
    <section className="explain-strip">
      <div className="step-number">{String(frame.index + 1).padStart(2, "0")}</div>
      <div className="explain-copy"><span>{frame.event.phase.toUpperCase()}</span><strong>{frame.event.label}</strong><p>{frame.event.detail}</p></div>
      <div className="concept-pill"><small>CONCEPT</small><b>{projectTarjanConceptLabel(frame.state)}</b></div>
    </section>
  );
}

function TarjanVariablesPanel({ frame }: { frame: TarjanFrame }): React.ReactElement {
  return (
    <div className="variables-table">
      <div className="table-head"><span>NODE</span><span>DISC</span><span>LOW</span><span>STACK</span><span>SCC</span></div>
      {projectTarjanVariables(frame).map((row) => (
        <div className={"variable-row " + (row.focused ? "focused" : "")} key={row.label}>
          <span><i className={"node-dot " + (row.onStack ? "blue" : row.inComponent ? "green" : "")} />{row.label}</span>
          <code>{row.disc ?? "—"}</code><code>{row.low ?? "—"}</code><b>{row.onStack ? "yes" : "no"}</b><small>{row.component ?? "—"}</small>
        </div>
      ))}
    </div>
  );
}

function TarjanCallStackPanel({ frame }: { frame: TarjanFrame }): React.ReactElement {
  const entries = projectTarjanCallStack(frame);
  return (
    <div className="call-stack-list">
      {entries.length === 0 ? <div className="empty-state">Stack is empty</div> : entries.map((entry) => (
        <div className={"stack-frame " + (entry.active ? "current" : "")} key={entry.label + "-" + entry.depth}>
          <span className="frame-number">#{String(entry.depth + 1).padStart(2, "0")}</span><span><strong>dfs({entry.label})</strong><small>disc {entry.disc} · low {entry.low}</small></span><b>{entry.active ? "active" : "paused"}</b>
        </div>
      ))}
    </div>
  );
}

function TarjanConceptsPanel({ frame }: { frame: TarjanFrame }): React.ReactElement {
  return (
    <div className="concept-list">
      {projectTarjanConcepts(frame).map((concept) => (
        <div className={"concept-card " + (concept.active ? "active" : "")} key={concept.id}><span className="concept-icon">◇</span><span><strong>{concept.label}</strong><small>{concept.detail}</small></span><i>›</i></div>
      ))}
    </div>
  );
}

function TarjanTimelinePanel({ frameIndex, onStep }: { frameIndex: number; onStep: (index: number) => void }): React.ReactElement {
  return (
    <div className="timeline-list">
      {projectTarjanTimeline(tarjanFrames, frameIndex).map((entry) => (
        <button className={"timeline-entry " + (entry.active ? "active" : "")} key={entry.eventId} onClick={() => onStep(entry.index)}><span className="timeline-index">{String(entry.index + 1).padStart(2, "0")}</span><span><strong>{entry.label}</strong><small>{entry.phase}</small></span></button>
      ))}
    </div>
  );
}

function TarjanPanels({ frame, onStep }: { frame: TarjanFrame; onStep: (index: number) => void }): React.ReactElement {
  const [panel, setPanel] = useState<"variables" | "call-stack" | "concepts" | "timeline">("variables");
  const panelIds = ["variables", "call-stack", "concepts", "timeline"] as const;
  const panelLabel = (id: typeof panelIds[number]) => id === "call-stack" ? "Call Stack" : id === "variables" ? "Variables" : id === "concepts" ? "Concepts" : "Timeline";
  const componentSummary = frame.state.components.map((component) => "{" + component.map((member) => frame.state.labels[member]).join(", ") + "}").join(" · ") || "—";

  return (
    <aside className="tarjan-panels">
      <div className="panel-tabs">{panelIds.map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div>
      <div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "variables" ? "live" : panel === "call-stack" ? frame.state.callStack.length + " frames" : panel === "concepts" ? "4 concepts" : tarjanFrames.length + " events"}</small></div>
      <div className="panel-body">{panel === "variables" ? <TarjanVariablesPanel frame={frame} /> : panel === "call-stack" ? <TarjanCallStackPanel frame={frame} /> : panel === "concepts" ? <TarjanConceptsPanel frame={frame} /> : <TarjanTimelinePanel frameIndex={frame.index} onStep={onStep} />}</div>
      <div className="watch-panel"><div className="panel-heading"><span>WATCH</span><small>semantic</small></div><div className="watch-row"><span>current</span><b>{frame.state.current == null ? "—" : frame.state.labels[frame.state.current]}</b></div><div className="watch-row"><span>summary</span><b>{componentSummary}</b></div><div className="watch-row"><span>phase</span><b>{frame.state.phase}</b></div></div>
    </aside>
  );
}

function TransportPanel({ step, onStep }: { step: number; onStep: (index: number) => void }): React.ReactElement {
  const advance = () => onStep(step < tarjanFrames.length - 1 ? step + 1 : 0);
  return (
    <section className="transport-panel">
      <div className="transport-top"><span>EXECUTION TRACE</span><small>{step + 1} / {tarjanFrames.length} events</small></div>
      <div className="transport-track"><div className="track-line"><i style={{ width: (step / Math.max(1, tarjanFrames.length - 1)) * 100 + "%" }} /></div>{tarjanFrames.map((candidate, index) => <button key={candidate.event.id} className={index <= step ? "done" : ""} onClick={() => onStep(index)} aria-label={"Go to event " + (index + 1)} />)}</div>
      <div className="transport-controls"><button onClick={() => onStep(step - 1)} aria-label="Previous event">←</button><button className="play-button" onClick={advance} aria-label={step === tarjanFrames.length - 1 ? "Restart trace" : "Next event"}>{step === tarjanFrames.length - 1 ? "↺" : "▶"}</button><button onClick={() => onStep(step + 1)} aria-label="Next event">→</button><span className="key-hint"><kbd>←</kbd><kbd>→</kbd> STEP</span></div>
    </section>
  );
}

export function ErrorPanel({ message }: { message: string }): React.ReactElement {
  return <section className="error-panel" role="alert"><strong>Tarjan visualization unavailable</strong><p>{message}</p><span>Reopen the .algor.json document to try again.</span></section>;
}

export function TarjanEditor({ initialStep, initialLayout, initialSelectedIds, postMessage }: { initialStep: number; initialLayout: Record<string, LayoutRect> | null; initialSelectedIds: string[]; postMessage(message: WebviewToHostMessage): void }): React.ReactElement {
  const [step, setStep] = useState(() => Math.max(0, Math.min(tarjanFrames.length - 1, initialStep)));
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => normalizeTarjanLayout(initialLayout));
  const frame = tarjanFrames[step];
  const elements = useMemo(() => frame ? convertToStableExcalidrawElements(createTarjanSkeletons(frame.state, layout)) : [], [frame, layout]);

  if (!frame) return <ErrorPanel message="The verified Tarjan artifact has no replay frame at this index." />;

  const changeStep = (next: number) => {
    const replayIndex = Math.max(0, Math.min(tarjanFrames.length - 1, next));
    setStep(replayIndex);
    postMessage({ version: 1, type: "replay-changed", replayIndex });
  };
  const acceptLayout = (next: Record<string, LayoutRect>) => {
    const normalized = normalizeTarjanLayout(next);
    setLayout(normalized);
    postMessage({ version: 1, type: "layout-changed", layout: normalized });
  };

  return (
    <main className="tarjan-editor" data-frame={frame.index} data-node-a-x={layout["node:A"]?.x}>
      <header className="editor-header"><div><span className="eyebrow">NOW REPLAYING</span><h1>Tarjan's Strongly Connected Components</h1></div><span className="read-only-badge">READ ONLY</span></header>
      <TarjanCanvas frame={frame} elements={elements} layout={layout} initialSelectedIds={initialSelectedIds} onLayout={acceptLayout} onSelection={(selectedIds) => postMessage({ version: 1, type: "selection-changed", selectedIds })} />
      <ExplainStrip frame={frame} />
      <TarjanPanels frame={frame} onStep={changeStep} />
      <TransportPanel step={step} onStep={changeStep} />
    </main>
  );
}
