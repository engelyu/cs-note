import React, { useEffect, useMemo, useRef, useState } from "react";
import { convertToExcalidrawElements, Excalidraw } from "../excalidraw";
import type { LayoutRect } from "../core/types";
import { captureTarjanLayout, createTarjanSkeletons } from "../visualizations/tarjanScene";
import { TARJAN_LAYOUT, tarjanPackage, type TarjanState } from "../visualizations/tarjan";
import {
  projectTarjanCallStack,
  projectTarjanConcepts,
  projectTarjanTimeline,
  projectTarjanVariables,
} from "../visualizations/tarjanProjections";

type PanelId = "variables" | "call-stack" | "concepts" | "timeline";

type ExcalidrawElement = {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type ExcalidrawApi = {
  updateScene: (scene: { elements: unknown[] }) => void;
};

const frames = tarjanPackage.scenarios[0].frames;

export function App() {
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<PanelId>("variables");
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [layout, setLayout] = useState<Record<string, LayoutRect>>(() => ({ ...TARJAN_LAYOUT }));
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const applyingSceneRef = useRef(false);
  const frame = frames[step];

  const elements = useMemo(
    () => convertToExcalidrawElements(createTarjanSkeletons(frame.state, layout)),
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
    const nextLayout = captureTarjanLayout(nextElements as ExcalidrawElement[], layout);
    const changed = Object.keys(nextLayout).some((id) => {
      const before = layout[id];
      const after = nextLayout[id];
      return before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height;
    });
    if (changed) setLayout(nextLayout);
  };

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
            <span><strong>The simplest cycle</strong><small>Tarjan · 15 events</small></span>
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
            <div className="editor-actions"><button className="action-button">↗ <span>Open lesson</span></button><button className="action-button" onClick={() => setInspectorVisible((visible) => !visible)}>{inspectorVisible ? "Hide" : "Show"} panels</button></div>
          </div>

          <section className="canvas-frame" aria-label="Algorithm canvas">
            <div className="canvas-grid" />
            <div className="canvas-breadcrumb"><span className="live-dot" /> <span>GRAPH / TARJAN-SCC</span><b>FRAME {String(step + 1).padStart(2, "0")}</b></div>
            <div className="excalidraw-host">
              <Excalidraw
                initialData={{ elements, appState: { viewBackgroundColor: "#17191f" } }}
                theme="dark"
                excalidrawAPI={(api: unknown) => { apiRef.current = api as ExcalidrawApi; }}
                onChange={handleCanvasChange}
                UIOptions={{
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
            <div className="canvas-hint">Drag nodes to adjust the reading layout</div>
          </section>

          <section className="explain-strip">
            <div className="step-number">{String(step + 1).padStart(2, "0")}</div>
            <div className="explain-copy"><span>{frame.event.phase.toUpperCase()}</span><strong>{frame.event.label}</strong><p>{frame.event.detail}</p></div>
            <div className="concept-pill"><small>CONCEPT</small><b>{conceptLabel(frame.state)}</b></div>
          </section>

          <section className="transport-panel">
            <div className="transport-top"><span>EXECUTION TRACE</span><small>{step + 1} / {frames.length} events</small></div>
            <div className="transport-track"><div className="track-line"><i style={{ width: `${(step / Math.max(1, frames.length - 1)) * 100}%` }} /></div>{frames.map((candidate, index) => <button key={candidate.event.id} className={index <= step ? "done" : ""} onClick={() => changeStep(index)} aria-label={`Go to event ${index + 1}`} />)}</div>
            <div className="transport-controls"><button onClick={() => changeStep(step - 1)} aria-label="Previous event">←</button><button className="play-button" onClick={() => changeStep(step === frames.length - 1 ? 0 : step + 1)} aria-label="Next event">{step === frames.length - 1 ? "↺" : "▶"}</button><button onClick={() => changeStep(step + 1)} aria-label="Next event">→</button><span className="key-hint"><kbd>←</kbd><kbd>→</kbd> STEP</span></div>
          </section>
        </main>

        {inspectorVisible && <aside className="secondary-sidebar">
          <div className="panel-tabs">{(["variables", "call-stack", "concepts", "timeline"] as PanelId[]).map((id) => <button key={id} className={panel === id ? "active" : ""} onClick={() => setPanel(id)}>{panelLabel(id)}</button>)}</div>
          <div className="panel-heading"><span>{panelLabel(panel).toUpperCase()}</span><small>{panel === "variables" ? "live" : panel === "call-stack" ? `${frame.state.stack.length} frames` : panel === "concepts" ? "3 concepts" : `${frames.length} events`}</small></div>
          <div className="panel-body">{panel === "variables" ? <VariablesPanel frame={frame} /> : panel === "call-stack" ? <CallStackPanel frame={frame} /> : panel === "concepts" ? <ConceptsPanel frame={frame} /> : <TimelinePanel frameIndex={frame.index} onSelect={changeStep} />}</div>
          <div className="watch-panel"><div className="panel-heading"><span>WATCH</span><small>semantic</small></div><div className="watch-row"><span>current</span><b>{frame.state.current == null ? "—" : frame.state.labels[frame.state.current]}</b></div><div className="watch-row"><span>components</span><b>{frame.state.components.length}</b></div><div className="watch-row"><span>line</span><b>{frame.state.line}</b></div></div>
        </aside>}
      </div>

      <footer className="statusbar"><span><i className="status-dot" /> CS NOTE / LOCAL ARTIFACT</span><span>Tarjan SCC · schema v1</span><span className="status-spacer" /><span>EN</span><span>UTF-8</span></footer>
    </div>
  );
}

function panelLabel(id: PanelId): string {
  return id === "call-stack" ? "Call Stack" : id === "variables" ? "Variables" : id === "concepts" ? "Concepts" : "Timeline";
}

function conceptLabel(state: TarjanState): string {
  if (state.line === "back-edge") return "low-link";
  if (state.line === "pop-scc" || state.components.length > 0) return "SCC root";
  if (state.stack.length > 0) return "onStack";
  return "DFS";
}

function VariablesPanel({ frame }: { frame: typeof frames[number] }) {
  const rows = projectTarjanVariables(frame);
  return <div className="variables-table"><div className="table-head"><span>NODE</span><span>DISC</span><span>LOW</span><span>STACK</span></div>{rows.map((row) => <div className={`variable-row ${row.focused ? "focused" : ""}`} key={row.label}><span><i className={`node-dot ${row.onStack ? "blue" : row.inComponent ? "green" : ""}`} />{row.label}</span><code>{row.disc ?? "—"}</code><code>{row.low ?? "—"}</code><b>{row.onStack ? "yes" : "no"}</b></div>)}</div>;
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
