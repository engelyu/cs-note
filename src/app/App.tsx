import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { convertToStableExcalidrawElements, Excalidraw } from "../excalidraw";
import type { LayoutRect } from "../core/types";
import { captureTarjanLayout, createTarjanSkeletons, isTarjanSceneExact, isTarjanSceneSafe } from "../visualizations/tarjanScene";
import type { CanvasElementSnapshot } from "../visualizations/tarjanScene";
import { TARJAN_LAYOUT } from "../visualizations/tarjanLayout";
import { tarjanPackage } from "../visualizations/tarjanRuntime";
import type { TarjanState } from "../visualizations/tarjanModel";
import { projectTarjanCallStack, projectTarjanConcepts, projectTarjanConceptLabel, projectTarjanTimeline, projectTarjanVariables } from "../visualizations/tarjanProjections";
import { captureLisLayout, createLisSkeletons, isLisSceneExact, isLisSceneSafe } from "../visualizations/lisScene";
import { LIS_LAYOUT } from "../visualizations/lisLayout";
import { lisPackage } from "../visualizations/lisRuntime";
import type { LisState } from "../visualizations/lisModel";
import { projectLisConceptLabel, projectLisConcepts, projectLisTimeline, projectLisVariables } from "../visualizations/lisProjections";
import { algorithmVisualizerDfs, algorithmVisualizerDfsFrames } from "../algorithmVisualizer/dfsRuntime";
import type { AlgorithmVisualizerFrame } from "../algorithmVisualizer/trace";
import {
  captureAlgorithmVisualizerGraphLayout,
  createAlgorithmVisualizerGraphSkeletons,
  isAlgorithmVisualizerGraphSceneSafe,
  type AlgorithmVisualizerCanvasElement,
} from "../algorithmVisualizer/graphScene";

type AlgorithmId = "tarjan" | "lis" | "algorithm-visualizer";
type TarjanPanelId = "variables" | "call-stack" | "concepts" | "timeline";
type LisPanelId = "variables" | "concepts" | "timeline";
type AlgorithmVisualizerPanelId = "log" | "commands";

type ExcalidrawApi = { updateScene: (scene: { elements: unknown[] }) => void };

const tarjanScenario = tarjanPackage.scenarios[0];
const tarjanFrames = tarjanScenario.frames;
const lisScenario = lisPackage.scenarios[0];
const lisFrames = lisScenario.frames;

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

export function App() {
  const [algorithm, setAlgorithm] = useState<AlgorithmId>("tarjan");
  return (
    <WorkbenchShell algorithm={algorithm} onSelect={setAlgorithm}>
      {algorithm === "tarjan" ? <TarjanWorkbench /> : algorithm === "lis" ? <LisWorkbench /> : <AlgorithmVisualizerWorkbench />}
    </WorkbenchShell>
  );
}

function WorkbenchShell({ algorithm, onSelect, children }: { algorithm: AlgorithmId; onSelect: (algorithm: AlgorithmId) => void; children: ReactNode }) {
  const title = algorithm === "tarjan" ? "Tarjan's Algorithm" : algorithm === "lis" ? "Longest Increasing Subsequence" : algorithmVisualizerDfs.title;
  return (
    <div className="cs-app">
      <header className="titlebar">
        <div className="brand"><span className="brand-mark">▦</span><span>CS Note</span></div>
        <div className="titlebar-path"><span>ALGORITHMS</span><b>/</b><strong>{title}</strong><em>LEARNING</em></div>
        <div className="titlebar-actions"><button aria-label="Command palette">⌘</button><button aria-label="More options">•••</button><span className="avatar">C</span></div>
      </header>

      <div className="workbench">
        <nav className="activitybar" aria-label="Activity bar">
          <button className="activity active" aria-label="Scenarios"><span>◈</span></button>
          <button className="activity" aria-label="Lessons"><span>▤</span></button>
          <button className="activity" aria-label="Search"><span>⌕</span></button>
          <div className="activity-spacer" />
          <button className="activity" aria-label="Settings"><span>⚙</span></button>
        </nav>

        <aside className="primary-sidebar">
          <div className="sidebar-heading"><span>ALGORITHMS</span><button aria-label="More algorithms">•••</button></div>
          <p className="sidebar-subtitle">Guided algorithm traces</p>
          <button className={`scenario-card ${algorithm === "tarjan" ? "active" : ""}`} onClick={() => onSelect("tarjan")}>
            <span className="scenario-index">01</span>
            <span><strong>Tarjan SCC</strong><small>Graph · {tarjanFrames.length} events</small></span>
            <i>›</i>
          </button>
          <button className={`scenario-card ${algorithm === "lis" ? "active" : ""}`} onClick={() => onSelect("lis")}>
            <span className="scenario-index lis-index">02</span>
            <span><strong>Longest Increasing Subsequence</strong><small>Dynamic programming · {lisFrames.length} events</small></span>
            <i>›</i>
          </button>
          <button className={`scenario-card ${algorithm === "algorithm-visualizer" ? "active" : ""}`} onClick={() => onSelect("algorithm-visualizer")}>
            <span className="scenario-index av-index">03</span>
            <span><strong>Imported DFS</strong><small>AV command trace · {algorithmVisualizerDfsFrames.length} frames</small></span>
            <i>›</i>
          </button>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">SESSION</div>
          <div className="session-card"><span className="session-dot" /><span><strong>{algorithm === "algorithm-visualizer" ? "Imported trace" : "Live trace"}</strong><small>{algorithm === "algorithm-visualizer" ? "Algorithm Visualizer commands" : "semantic artifact · v1"}</small></span></div>
          <div className="sidebar-note"><strong>What to watch</strong><p>{algorithm === "tarjan" ? "Low-link values travel backward through the DFS stack." : algorithm === "lis" ? "Each dp[i] records the best increasing subsequence ending here." : "Tracer commands become replay frames while the graph keeps its own state."}</p></div>
        </aside>

        {children}
      </div>

      <footer className="statusbar"><span><i className="status-dot" /> CS NOTE / LOCAL ARTIFACT</span><span>{algorithm === "tarjan" ? "Tarjan SCC" : algorithm === "lis" ? "LIS dynamic programming" : "Algorithm Visualizer command trace"} · schema v1</span><span className="status-spacer" /><span>EN</span><span>UTF-8</span></footer>
    </div>
  );
}

function TarjanWorkbench() {
  const capabilities = tarjanScenario.capabilities;
  const panelIds: TarjanPanelId[] = ["variables", "call-stack", "concepts", "timeline"];
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<TarjanPanelId>("variables");
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => ({ ...TARJAN_LAYOUT }));
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);
  const frame = tarjanFrames[step];
  const elements = useMemo(() => convertToStableExcalidrawElements(createTarjanSkeletons(frame.state, layout)), [frame, layout]);

  useEffect(() => {
    if (!apiRef.current) return;
    applyingSceneRef.current = true;
    apiRef.current.updateScene({ elements });
    const reset = window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    return () => window.clearTimeout(reset);
  }, [elements]);

  const changeStep = (next: number) => setStep(Math.max(0, Math.min(tarjanFrames.length - 1, next)));
  const handleCanvasChange = (nextElements: readonly unknown[]) => {
    if (applyingSceneRef.current) return;
    const nextLayout = captureTarjanLayout(nextElements as CanvasElementSnapshot[], layout);
    const changed = Object.keys(nextLayout).some((id) => {
      const before = layout[id];
      const after = nextLayout[id];
      return before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
    });
    if (changed && capabilities.editLayout) setLayout(nextLayout);
    const canonical = convertToStableExcalidrawElements(createTarjanSkeletons(frame.state, capabilities.editLayout ? nextLayout : layout));
    const allowed = capabilities.editLayout
      ? isTarjanSceneSafe(nextElements as CanvasElementSnapshot[], canonical as CanvasElementSnapshot[])
      : isTarjanSceneExact(nextElements as CanvasElementSnapshot[], canonical as CanvasElementSnapshot[]);
    if (!allowed) {
      applyingSceneRef.current = true;
      apiRef.current?.updateScene({ elements: canonical });
      window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    }
  };
  const componentSummary = frame.state.components.map((component) => `{${component.map((member) => frame.state.labels[member]).join(", ")}}`).join(" · ") || "—";

  return (
    <>
      <main className="editor-shell">
        <div className="editor-header"><div><span className="eyebrow">NOW DEBUGGING</span><h1>Tarjan's Strongly Connected Components</h1></div><div className="editor-actions"><button className="action-button">↗ <span>Open lesson</span></button><button className="action-button" onClick={() => setInspectorVisible((visible) => !visible)}>{inspectorVisible ? "Hide" : "Show"} panels</button></div></div>
        <section className="canvas-frame" aria-label="Algorithm canvas">
          <div className="canvas-grid" /><div className="canvas-breadcrumb"><span className="live-dot" /> <span>GRAPH / TARJAN-SCC</span><b>FRAME {String(step + 1).padStart(2, "0")}</b></div>
          <div className={`excalidraw-host ${capabilities.editInput ? "canvas-input-enabled" : "canvas-input-disabled"}`}><Excalidraw initialData={{ elements, appState: { viewBackgroundColor: "#17191f" } }} theme="dark" excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawApi; }} onChange={handleCanvasChange} UIOptions={{ tools: capabilities.editInput ? undefined : layoutOnlyTools, canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false, export: false } }} /></div>
          <div className="canvas-legend"><span><i className="legend-swatch on-stack" />On stack</span><span><i className="legend-swatch component" />SCC</span><span><i className="legend-ring" />Current</span></div><div className="canvas-hint">Only node layout edits persist; graph and algorithm edits are restored</div>
        </section>
        <ExplainStrip frame={frame} concept={projectTarjanConceptLabel(frame.state)} />
        <TransportPanel step={step} frames={tarjanFrames} onChange={changeStep} rerun={capabilities.rerun} />
      </main>
      {(!capabilities.toggleView || inspectorVisible) && <aside className="secondary-sidebar"><div className="panel-tabs">{panelIds.map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div><div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "variables" ? "live" : panel === "call-stack" ? `${frame.state.callStack.length} frames` : panel === "concepts" ? "4 concepts" : `${tarjanFrames.length} events`}</small></div><div className="panel-body">{panel === "variables" ? <TarjanVariablesPanel frame={frame} /> : panel === "call-stack" ? <TarjanCallStackPanel frame={frame} /> : panel === "concepts" ? <TarjanConceptsPanel frame={frame} /> : <TarjanTimelinePanel frameIndex={frame.index} onSelect={changeStep} />}</div><WatchPanel current={frame.state.current == null ? "—" : frame.state.labels[frame.state.current]} summary={componentSummary} phase={frame.state.phase} /></aside>}
    </>
  );
}

const ALGORITHM_VISUALIZER_LAYOUT: Record<string, LayoutRect> = {
  "node:A": { x: 180, y: 100, width: 84, height: 84 },
  "node:B": { x: 420, y: 100, width: 84, height: 84 },
  "node:C": { x: 300, y: 300, width: 84, height: 84 },
};

function AlgorithmVisualizerWorkbench() {
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<AlgorithmVisualizerPanelId>("log");
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => ({ ...ALGORITHM_VISUALIZER_LAYOUT }));
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);
  const frame = algorithmVisualizerDfsFrames[step];
  const graph = frame.graph;
  if (!graph) throw new Error("Imported Algorithm Visualizer frame has no graph state");
  const elements = useMemo(() => convertToStableExcalidrawElements(createAlgorithmVisualizerGraphSkeletons(graph, layout)), [graph, layout]);

  useEffect(() => {
    if (!apiRef.current) return;
    applyingSceneRef.current = true;
    apiRef.current.updateScene({ elements });
    const reset = window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    return () => window.clearTimeout(reset);
  }, [elements]);

  const changeStep = (next: number) => setStep(Math.max(0, Math.min(algorithmVisualizerDfsFrames.length - 1, next)));
  const handleCanvasChange = (nextElements: readonly unknown[]) => {
    if (applyingSceneRef.current) return;
    const typedElements = nextElements as AlgorithmVisualizerCanvasElement[];
    const nextLayout = captureAlgorithmVisualizerGraphLayout(typedElements, layout);
    const changed = Object.keys(nextLayout).some((id) => {
      const before = layout[id];
      const after = nextLayout[id];
      return before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
    });
    if (changed) setLayout(nextLayout);
    const canonical = convertToStableExcalidrawElements(createAlgorithmVisualizerGraphSkeletons(graph, changed ? nextLayout : layout));
    if (!isAlgorithmVisualizerGraphSceneSafe(typedElements, canonical as AlgorithmVisualizerCanvasElement[])) {
      applyingSceneRef.current = true;
      apiRef.current?.updateScene({ elements: canonical });
      window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    }
  };

  const lastLog = frame.logs.at(-1) ?? "No log output yet";
  const lastCommand = frame.commands.at(-1);
  const graphSummary = `${graph.nodes.length} nodes · ${graph.edges.length} edges`;

  return (
    <>
      <main className="editor-shell">
        <div className="editor-header"><div><span className="eyebrow">IMPORTED TRACE</span><h1>{algorithmVisualizerDfs.title}</h1></div><div className="editor-actions"><button className="action-button">↗ <span>Open source</span></button><button className="action-button" onClick={() => setInspectorVisible((visible) => !visible)}>{inspectorVisible ? "Hide" : "Show"} panels</button></div></div>
        <section className="canvas-frame" aria-label="Imported algorithm canvas">
          <div className="canvas-grid" /><div className="canvas-breadcrumb"><span className="live-dot" /> <span>IMPORTED / AV-COMMANDS</span><b>FRAME {String(step + 1).padStart(2, "0")}</b></div>
          <div className="excalidraw-host canvas-input-disabled"><Excalidraw initialData={{ elements, appState: { viewBackgroundColor: "#17191f" } }} theme="dark" excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawApi; }} onChange={handleCanvasChange} UIOptions={{ tools: layoutOnlyTools, canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false, export: false } }} /></div>
          <div className="canvas-legend"><span><i className="legend-swatch on-stack" />Visited</span><span><i className="legend-swatch component" />Focus</span><span><i className="legend-ring" />Replay frame</span></div><div className="canvas-hint">Command state is read-only; node layout remains yours</div>
        </section>
        <section className="explain-strip"><div className="step-number">{String(frame.index + 1).padStart(2, "0")}</div><div className="explain-copy"><span>TRACER COMMAND</span><strong>{lastCommand?.method ?? "Initial state"}</strong><p>{lastLog}</p></div><div className="concept-pill"><small>SOURCE LINE</small><b>{frame.lineNumber ?? "—"}</b></div></section>
        <AlgorithmVisualizerTransportPanel step={step} frames={algorithmVisualizerDfsFrames} onChange={changeStep} />
      </main>
      {inspectorVisible && <aside className="secondary-sidebar"><div className="panel-tabs">{(["log", "commands"] as const).map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div><div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "log" ? `${frame.logs.length} lines` : `${frame.commands.length} commands`}</small></div><div className="panel-body">{panel === "log" ? <AlgorithmVisualizerLogPanel logs={frame.logs} /> : <AlgorithmVisualizerCommandPanel frame={frame} />}</div><WatchPanel current={lastCommand?.method ?? "—"} summary={graphSummary} phase={frame.lineNumber == null ? "artifact" : `line ${frame.lineNumber}`} /></aside>}
    </>
  );
}

function AlgorithmVisualizerTransportPanel({ step, frames, onChange }: { step: number; frames: readonly AlgorithmVisualizerFrame[]; onChange: (index: number) => void }) {
  return <section className="transport-panel"><div className="transport-top"><span>COMMAND TRACE</span><small>{step + 1} / {frames.length} frames</small></div><div className="transport-track"><div className="track-line"><i style={{ width: `${(step / Math.max(1, frames.length - 1)) * 100}%` }} /></div>{frames.map((frame, index) => <button key={`av-frame-${frame.index}`} className={index <= step ? "done" : ""} onClick={() => onChange(index)} aria-label={`Go to imported frame ${index + 1}`} />)}</div><div className="transport-controls"><button onClick={() => onChange(step - 1)} aria-label="Previous imported frame">←</button><button className="play-button" onClick={() => onChange(step + 1)} disabled={step === frames.length - 1} aria-label={step === frames.length - 1 ? "Trace complete" : "Next imported frame"}>{step === frames.length - 1 ? "✓" : "▶"}</button><button onClick={() => onChange(step + 1)} aria-label="Next imported frame">→</button><span className="key-hint"><kbd>←</kbd><kbd>→</kbd> STEP</span></div></section>;
}

function AlgorithmVisualizerLogPanel({ logs }: { logs: readonly string[] }) {
  return <div className="timeline-list">{logs.length === 0 ? <div className="empty-state">No log output</div> : logs.map((log, index) => <div className="timeline-entry active" key={`${index}-${log}`}><span className="timeline-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{log}</strong><small>LogTracer</small></span></div>)}</div>;
}

function AlgorithmVisualizerCommandPanel({ frame }: { frame: AlgorithmVisualizerFrame }) {
  return <div className="timeline-list">{frame.commands.length === 0 ? <div className="empty-state">No commands before this frame</div> : frame.commands.map((command, index) => <div className="timeline-entry" key={`${index}-${command.key}-${command.method}`}><span className="timeline-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{command.method}</strong><small>{command.key ?? "layout"}</small></span></div>)}</div>;
}

function LisWorkbench() {
  const capabilities = lisScenario.capabilities;
  const panelIds: LisPanelId[] = ["variables", "concepts", "timeline"];
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<LisPanelId>("variables");
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => ({ ...LIS_LAYOUT }));
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);
  const frame = lisFrames[step];
  const elements = useMemo(() => convertToStableExcalidrawElements(createLisSkeletons(frame.state, layout)), [frame, layout]);

  useEffect(() => {
    if (!apiRef.current) return;
    applyingSceneRef.current = true;
    apiRef.current.updateScene({ elements });
    const reset = window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    return () => window.clearTimeout(reset);
  }, [elements]);

  const changeStep = (next: number) => setStep(Math.max(0, Math.min(lisFrames.length - 1, next)));
  const handleCanvasChange = (nextElements: readonly unknown[]) => {
    if (applyingSceneRef.current) return;
    const nextLayout = captureLisLayout(nextElements as CanvasElementSnapshot[], layout);
    const changed = Object.keys(nextLayout).some((id) => {
      const before = layout[id];
      const after = nextLayout[id];
      return before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
    });
    if (changed && capabilities.editLayout) setLayout(nextLayout);
    const canonical = convertToStableExcalidrawElements(createLisSkeletons(frame.state, capabilities.editLayout ? nextLayout : layout));
    const allowed = capabilities.editLayout
      ? isLisSceneSafe(nextElements as CanvasElementSnapshot[], canonical as CanvasElementSnapshot[])
      : isLisSceneExact(nextElements as CanvasElementSnapshot[], canonical as CanvasElementSnapshot[]);
    if (!allowed) {
      applyingSceneRef.current = true;
      apiRef.current?.updateScene({ elements: canonical });
      window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    }
  };
  const best = frame.state.bestIndex === null ? "—" : `${frame.state.dp[frame.state.bestIndex]} @ ${frame.state.bestIndex}`;

  return (
    <>
      <main className="editor-shell">
        <div className="editor-header"><div><span className="eyebrow">NOW DEBUGGING</span><h1>Longest Increasing Subsequence</h1></div><div className="editor-actions"><button className="action-button">↗ <span>Open lesson</span></button><button className="action-button" onClick={() => setInspectorVisible((visible) => !visible)}>{inspectorVisible ? "Hide" : "Show"} panels</button></div></div>
        <section className="canvas-frame" aria-label="Algorithm canvas">
          <div className="canvas-grid" /><div className="canvas-breadcrumb"><span className="live-dot" /> <span>ARRAY / LIS-DP</span><b>FRAME {String(step + 1).padStart(2, "0")}</b></div>
          <div className={`excalidraw-host ${capabilities.editInput ? "canvas-input-enabled" : "canvas-input-disabled"}`}><Excalidraw initialData={{ elements, appState: { viewBackgroundColor: "#17191f" } }} theme="dark" excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawApi; }} onChange={handleCanvasChange} UIOptions={{ tools: capabilities.editInput ? undefined : layoutOnlyTools, canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false, export: false } }} /></div>
          <div className="canvas-legend"><span><i className="legend-swatch sequence" />LIS member</span><span><i className="legend-swatch compare" />Compare</span><span><i className="legend-ring" />Current</span></div><div className="canvas-hint">Cells and predecessor links are read-only; layout remains yours</div>
        </section>
        <ExplainStrip frame={frame} concept={projectLisConceptLabel(frame.state)} />
        <TransportPanel step={step} frames={lisFrames} onChange={changeStep} rerun={capabilities.rerun} />
      </main>
      {(!capabilities.toggleView || inspectorVisible) && <aside className="secondary-sidebar"><div className="panel-tabs">{panelIds.map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div><div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "variables" ? "live" : panel === "concepts" ? "4 concepts" : `${lisFrames.length} events`}</small></div><div className="panel-body">{panel === "variables" ? <LisVariablesPanel frame={frame} /> : panel === "concepts" ? <LisConceptsPanel frame={frame} /> : <LisTimelinePanel frameIndex={frame.index} onSelect={changeStep} />}</div><WatchPanel current={frame.state.currentIndex === null ? "—" : `a[${frame.state.currentIndex}]`} summary={`length ${frame.state.sequence.length} · best ${best}`} phase={frame.state.phase} /></aside>}
    </>
  );
}

function ExplainStrip({ frame, concept }: { frame: { event: { phase: string; label: string; detail: string }; index: number }; concept: string }) {
  return <section className="explain-strip"><div className="step-number">{String(frame.index + 1).padStart(2, "0")}</div><div className="explain-copy"><span>{frame.event.phase.toUpperCase()}</span><strong>{frame.event.label}</strong><p>{frame.event.detail}</p></div><div className="concept-pill"><small>CONCEPT</small><b>{concept}</b></div></section>;
}

function TransportPanel({ step, frames, onChange, rerun }: { step: number; frames: readonly { event: { id: string }; index: number }[]; onChange: (index: number) => void; rerun: boolean }) {
  const advance = () => { if (step < frames.length - 1) onChange(step + 1); else if (rerun) onChange(0); };
  return <section className="transport-panel"><div className="transport-top"><span>EXECUTION TRACE</span><small>{step + 1} / {frames.length} events</small></div><div className="transport-track"><div className="track-line"><i style={{ width: `${(step / Math.max(1, frames.length - 1)) * 100}%` }} /></div>{frames.map((candidate, index) => <button key={candidate.event.id} className={index <= step ? "done" : ""} onClick={() => onChange(index)} aria-label={`Go to event ${index + 1}`} />)}</div><div className="transport-controls"><button onClick={() => onChange(step - 1)} aria-label="Previous event">←</button><button className="play-button" onClick={advance} disabled={step === frames.length - 1 && !rerun} aria-label={step === frames.length - 1 ? (rerun ? "Rerun trace" : "Trace complete") : "Next event"}>{step === frames.length - 1 ? (rerun ? "↺" : "✓") : "▶"}</button><button onClick={() => onChange(step + 1)} aria-label="Next event">→</button><span className="key-hint"><kbd>←</kbd><kbd>→</kbd> STEP</span></div></section>;
}

function WatchPanel({ current, summary, phase }: { current: string; summary: string; phase: string }) {
  return <div className="watch-panel"><div className="panel-heading"><span>WATCH</span><small>semantic</small></div><div className="watch-row"><span>current</span><b>{current}</b></div><div className="watch-row"><span>summary</span><b>{summary}</b></div><div className="watch-row"><span>phase</span><b>{phase}</b></div></div>;
}

function panelLabel(id: TarjanPanelId | LisPanelId | AlgorithmVisualizerPanelId): string {
  return id === "call-stack" ? "Call Stack" : id === "variables" ? "Variables" : id === "concepts" ? "Concepts" : id === "log" ? "Log" : id === "commands" ? "Commands" : "Timeline";
}

function TarjanVariablesPanel({ frame }: { frame: typeof tarjanFrames[number] }) {
  const rows = projectTarjanVariables(frame);
  return <div className="variables-table"><div className="table-head"><span>NODE</span><span>DISC</span><span>LOW</span><span>STACK</span><span>SCC</span></div>{rows.map((row) => <div className={`variable-row ${row.focused ? "focused" : ""}`} key={row.label}><span><i className={`node-dot ${row.onStack ? "blue" : row.inComponent ? "green" : ""}`} />{row.label}</span><code>{row.disc ?? "—"}</code><code>{row.low ?? "—"}</code><b>{row.onStack ? "yes" : "no"}</b><small>{row.component ?? "—"}</small></div>)}</div>;
}

function TarjanCallStackPanel({ frame }: { frame: typeof tarjanFrames[number] }) {
  const entries = projectTarjanCallStack(frame);
  return <div className="call-stack-list">{entries.length === 0 ? <div className="empty-state">Stack is empty</div> : entries.map((entry) => <div className={`stack-frame ${entry.active ? "current" : ""}`} key={`${entry.label}-${entry.depth}`}><span className="frame-number">#{String(entry.depth + 1).padStart(2, "0")}</span><span><strong>dfs({entry.label})</strong><small>disc {entry.disc} · low {entry.low}</small></span><b>{entry.active ? "active" : "paused"}</b></div>)}</div>;
}

function TarjanConceptsPanel({ frame }: { frame: typeof tarjanFrames[number] }) {
  return <div className="concept-list">{projectTarjanConcepts(frame).map((concept) => <div className={`concept-card ${concept.active ? "active" : ""}`} key={concept.id}><span className="concept-icon">◇</span><span><strong>{concept.label}</strong><small>{concept.detail}</small></span><i>›</i></div>)}</div>;
}

function TarjanTimelinePanel({ frameIndex, onSelect }: { frameIndex: number; onSelect: (index: number) => void }) {
  return <div className="timeline-list">{projectTarjanTimeline(tarjanFrames, frameIndex).map((entry) => <button className={`timeline-entry ${entry.active ? "active" : ""}`} key={entry.eventId} onClick={() => onSelect(entry.index)}><span className="timeline-index">{String(entry.index + 1).padStart(2, "0")}</span><span><strong>{entry.label}</strong><small>{entry.phase}</small></span></button>)}</div>;
}

function LisVariablesPanel({ frame }: { frame: typeof lisFrames[number] }) {
  return <div className="variables-table"><div className="table-head"><span>INDEX</span><span>VALUE</span><span>DP</span><span>PREV</span><span>LIS</span></div>{projectLisVariables(frame).map((row) => <div className={`variable-row ${row.focused ? "focused" : ""}`} key={row.index}><span><i className={`node-dot ${row.selected ? "green" : ""}`} />{row.index}</span><code>{row.value}</code><code>{row.dp}</code><code>{row.prev ?? "—"}</code><b>{row.selected ? "yes" : "no"}</b></div>)}</div>;
}

function LisConceptsPanel({ frame }: { frame: typeof lisFrames[number] }) {
  return <div className="concept-list">{projectLisConcepts(frame).map((concept) => <div className={`concept-card ${concept.active ? "active" : ""}`} key={concept.id}><span className="concept-icon">◇</span><span><strong>{concept.label}</strong><small>{concept.detail}</small></span><i>›</i></div>)}</div>;
}

function LisTimelinePanel({ frameIndex, onSelect }: { frameIndex: number; onSelect: (index: number) => void }) {
  return <div className="timeline-list">{projectLisTimeline(lisFrames, frameIndex).map((entry) => <button className={`timeline-entry ${entry.active ? "active" : ""}`} key={entry.eventId} onClick={() => onSelect(entry.index)}><span className="timeline-index">{String(entry.index + 1).padStart(2, "0")}</span><span><strong>{entry.label}</strong><small>{entry.phase}</small></span></button>)}</div>;
}
