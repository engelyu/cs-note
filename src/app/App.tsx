import React, { useEffect, useMemo, useRef, useState } from "react";
import { convertToStableExcalidrawElements, Excalidraw } from "../excalidraw";
import type { LayoutRect } from "../core/types";
import {
  captureTarjanLayout,
  createTarjanSkeletons,
  isTarjanSceneExact,
  isTarjanSceneSafe,
} from "../visualizations/tarjanScene";
import type { CanvasElementSnapshot } from "../visualizations/tarjanScene";
import { TARJAN_LAYOUT } from "../visualizations/tarjanLayout";
import { tarjanPackage } from "../visualizations/tarjanRuntime";
import type { TarjanState } from "../visualizations/tarjanModel";
import {
  projectTarjanCallStack,
  projectTarjanConcepts,
  projectTarjanConceptLabel,
  projectTarjanTimeline,
  projectTarjanVariables,
} from "../visualizations/tarjanProjections";

type PanelId = "variables" | "call-stack" | "concepts" | "timeline";

type ExcalidrawApi = {
  updateScene: (scene: { elements: unknown[] }) => void;
};

const scenario = tarjanPackage.scenarios[0];
const frames = scenario.frames;
const capabilities = scenario.capabilities;
const panelIds = tarjanPackage.views
  .filter((view) => view.kind === "panel")
  .map((view) => view.id)
  .filter((id): id is PanelId => ["variables", "call-stack", "concepts", "timeline"].includes(id));

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
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<PanelId>(panelIds[0] ?? "variables");
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => ({ ...TARJAN_LAYOUT }));
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);
  const frame = frames[step];

  const elements = useMemo(
    () => convertToStableExcalidrawElements(createTarjanSkeletons(frame.state, layout)),
    [frame, layout],
  );

  useEffect(() => {
    if (!apiRef.current) return;
    applyingSceneRef.current = true;
    apiRef.current.updateScene({ elements });
    const reset = window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    return () => window.clearTimeout(reset);
  }, [elements]);

  const changeStep = (next: number) => {
    setStep(Math.max(0, Math.min(frames.length - 1, next)));
  };

  const handleCanvasChange = (nextElements: readonly unknown[]) => {
    if (applyingSceneRef.current) return;
    const nextLayout = captureTarjanLayout(nextElements as CanvasElementSnapshot[], layout);
    const changed = Object.keys(nextLayout).some((id) => {
      const before = layout[id];
      const after = nextLayout[id];
      return before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
    });
    if (changed && capabilities.editLayout) setLayout(nextLayout);

    const canonicalElements = convertToStableExcalidrawElements(
      createTarjanSkeletons(frame.state, capabilities.editLayout ? nextLayout : layout),
    );
    const sceneIsAllowed = capabilities.editLayout
      ? isTarjanSceneSafe(nextElements as CanvasElementSnapshot[], canonicalElements as CanvasElementSnapshot[])
      : isTarjanSceneExact(nextElements as CanvasElementSnapshot[], canonicalElements as CanvasElementSnapshot[]);
    if (!sceneIsAllowed) {
      applyingSceneRef.current = true;
      apiRef.current?.updateScene({ elements: canonicalElements });
      window.setTimeout(() => { applyingSceneRef.current = false; }, 0);
    }
  };

  const advanceTrace = () => {
    if (step < frames.length - 1) changeStep(step + 1);
    else if (capabilities.rerun) changeStep(0);
  };

  const componentSummary = frame.state.components.map((component) => `{${component.map((member) => frame.state.labels[member]).join(", ")}}`).join(" · ") || "—";

  return (
    <div className="cs-app">
      <header className="titlebar">
        <div className="brand"><span className="brand-mark">▦</span><span>CS Note</span></div>
        <div className="titlebar-path"><span>ALGORITHMS</span><b>/</b><strong>Tarjan's Algorithm</strong><em>LEARNING</em></div>
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
          <div className="sidebar-heading"><span>SCENARIOS</span><button aria-label="More scenarios">•••</button></div>
          <p className="sidebar-subtitle">Guided algorithm traces</p>
          <button className="scenario-card active">
            <span className="scenario-index">01</span>
            <span><strong>{scenario.title}</strong><small>Tarjan · {frames.length} events</small></span>
            <i>›</i>
          </button>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">SESSION</div>
          <div className="session-card"><span className="session-dot" /><span><strong>Live trace</strong><small>semantic artifact · v1</small></span></div>
          <div className="sidebar-note"><strong>What to watch</strong><p>Low-link values travel backward through the DFS stack.</p></div>
        </aside>

        <main className="editor-shell">
          <div className="editor-header">
            <div><span className="eyebrow">NOW DEBUGGING</span><h1>Tarjan's Strongly Connected Components</h1></div>
            <div className="editor-actions"><button className="action-button">↗ <span>Open lesson</span></button>{capabilities.toggleView && <button className="action-button" onClick={() => setInspectorVisible((visible) => !visible)}>{inspectorVisible ? "Hide" : "Show"} panels</button>}</div>
          </div>

          <section className="canvas-frame" aria-label="Algorithm canvas">
            <div className="canvas-grid" />
            <div className="canvas-breadcrumb"><span className="live-dot" /> <span>GRAPH / TARJAN-SCC</span><b>FRAME {String(step + 1).padStart(2, "0")}</b></div>
            <div className={`excalidraw-host ${capabilities.editInput ? "canvas-input-enabled" : "canvas-input-disabled"}`}>
              <Excalidraw
                initialData={{ elements, appState: { viewBackgroundColor: "#17191f" } }}
                theme="dark"
                excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawApi; }}
                onChange={handleCanvasChange}
                UIOptions={{
                  tools: capabilities.editInput ? undefined : layoutOnlyTools,
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
          </section>

          <section className="explain-strip">
            <div className="step-number">{String(step + 1).padStart(2, "0")}</div>
            <div className="explain-copy"><span>{frame.event.phase.toUpperCase()}</span><strong>{frame.event.label}</strong><p>{frame.event.detail}</p></div>
            <div className="concept-pill"><small>CONCEPT</small><b>{projectTarjanConceptLabel(frame.state)}</b></div>
          </section>

          <section className="transport-panel">
            <div className="transport-top"><span>EXECUTION TRACE</span><small>{step + 1} / {frames.length} events</small></div>
            <div className="transport-track"><div className="track-line"><i style={{ width: `${(step / Math.max(1, frames.length - 1)) * 100}%` }} /></div>{frames.map((candidate, index) => <button key={candidate.event.id} className={index <= step ? "done" : ""} onClick={() => changeStep(index)} aria-label={`Go to event ${index + 1}`} />)}</div>
            <div className="transport-controls"><button onClick={() => changeStep(step - 1)} aria-label="Previous event">←</button><button className="play-button" onClick={advanceTrace} disabled={step === frames.length - 1 && !capabilities.rerun} aria-label={step === frames.length - 1 ? (capabilities.rerun ? "Rerun trace" : "Trace complete") : "Next event"}>{step === frames.length - 1 ? (capabilities.rerun ? "↺" : "✓") : "▶"}</button><button onClick={() => changeStep(step + 1)} aria-label="Next event">→</button><span className="key-hint"><kbd>←</kbd><kbd>→</kbd> STEP</span></div>
          </section>
        </main>

        {(!capabilities.toggleView || inspectorVisible) && <aside className="secondary-sidebar">
          <div className="panel-tabs">{panelIds.map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div>
          <div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "variables" ? "live" : panel === "call-stack" ? `${frame.state.stack.length} frames` : panel === "concepts" ? "4 concepts" : `${frames.length} events`}</small></div>
          <div className="panel-body">{panel === "variables" ? <VariablesPanel frame={frame} /> : panel === "call-stack" ? <CallStackPanel frame={frame} /> : panel === "concepts" ? <ConceptsPanel frame={frame} /> : <TimelinePanel frameIndex={frame.index} onSelect={changeStep} />}</div>
          <div className="watch-panel"><div className="panel-heading"><span>WATCH</span><small>semantic</small></div><div className="watch-row"><span>current</span><b>{frame.state.current == null ? "—" : frame.state.labels[frame.state.current]}</b></div><div className="watch-row"><span>components</span><b>{componentSummary}</b></div><div className="watch-row"><span>phase</span><b>{frame.state.phase}</b></div></div>
        </aside>}
      </div>

      <footer className="statusbar"><span><i className="status-dot" /> CS NOTE / LOCAL ARTIFACT</span><span>Tarjan SCC · schema v1</span><span className="status-spacer" /><span>EN</span><span>UTF-8</span></footer>
    </div>
  );
}

function panelLabel(id: PanelId): string {
  return id === "call-stack" ? "Call Stack" : id === "variables" ? "Variables" : id === "concepts" ? "Concepts" : "Timeline";
}

function VariablesPanel({ frame }: { frame: typeof frames[number] }) {
  const rows = projectTarjanVariables(frame);
  return <div className="variables-table"><div className="table-head"><span>NODE</span><span>DISC</span><span>LOW</span><span>STACK</span><span>SCC</span></div>{rows.map((row) => <div className={`variable-row ${row.focused ? "focused" : ""}`} key={row.label}><span><i className={`node-dot ${row.onStack ? "blue" : row.inComponent ? "green" : ""}`} />{row.label}</span><code>{row.disc ?? "—"}</code><code>{row.low ?? "—"}</code><b>{row.onStack ? "yes" : "no"}</b><small>{row.component ?? "—"}</small></div>)}</div>;
}

function CallStackPanel({ frame }: { frame: typeof frames[number] }) {
  const entries = projectTarjanCallStack(frame);
  return <div className="call-stack-list">{entries.length === 0 ? <div className="empty-state">Stack is empty</div> : entries.map((entry) => <div className={`stack-frame ${entry.active ? "current" : ""}`} key={`${entry.label}-${entry.depth}`}><span className="frame-number">#{String(entry.depth + 1).padStart(2, "0")}</span><span><strong>dfs({entry.label})</strong><small>disc {entry.disc} · low {entry.low}</small></span><b>{entry.active ? "active" : "paused"}</b></div>)}</div>;
}

function ConceptsPanel({ frame }: { frame: typeof frames[number] }) {
  const concepts = projectTarjanConcepts(frame);
  return <div className="concept-list">{concepts.map((concept) => <div className={`concept-card ${concept.active ? "active" : ""}`} key={concept.id}><span className="concept-icon">◇</span><span><strong>{concept.label}</strong><small>{concept.detail}</small></span><i>›</i></div>)}</div>;
}

function TimelinePanel({ frameIndex, onSelect }: { frameIndex: number; onSelect: (index: number) => void }) {
  const entries = projectTarjanTimeline(frames, frameIndex);
  return <div className="timeline-list">{entries.map((entry) => <button className={`timeline-entry ${entry.active ? "active" : ""}`} key={entry.eventId} onClick={() => onSelect(entry.index)}><span className="timeline-index">{String(entry.index + 1).padStart(2, "0")}</span><span><strong>{entry.label}</strong><small>{entry.phase}</small></span></button>)}</div>;
}
