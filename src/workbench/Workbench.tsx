import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULTS,
  LIMITS,
  PARTS,
  columnOrder,
  panelColumnSpan,
  panelCovers,
  sanitizeWorkbenchState,
  type WorkbenchPart,
  type WorkbenchState,
} from "./workbenchState";

const STORAGE_KEY = "cs-note:workbench:v1";
const LEGACY_KEYS = Array.from({ length: 7 }, (_, index) => `dsvisual:graph-scc-tarjan:board:v${index + 1}`);
const TITLEBAR_H = 42;
const STATUSBAR_H = 24;
const ACTIVITYBAR_W = 46;
const EDITOR_MIN_W = 240;
const EDITOR_MIN_H = 120;

type ResizePart = "primarySideBar" | "secondarySideBar" | "panel";

export type WorkbenchProps = {
  title: string;
  algorithmLabel: string;
  primary: ReactNode;
  editor: ReactNode;
  secondary: ReactNode;
  panel: ReactNode;
  onEditorResize?: () => void;
};

function readInitialState(): WorkbenchState {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const state = sanitizeWorkbenchState(parsed);
    return {
      ...state,
      activeView: {
        primary: state.activeView.primary ?? "scenarios",
        secondary: state.activeView.secondary ?? "inspector",
        panel: state.activeView.panel ?? "execution",
      },
    };
  } catch {
    return {
      ...DEFAULTS,
      visible: { ...DEFAULTS.visible },
      sizes: { ...DEFAULTS.sizes },
      activeView: { primary: "scenarios", secondary: "inspector", panel: "execution" },
    };
  }
}

function partLabel(part: WorkbenchPart): string {
  if (part === "primarySideBar") return "Primary Side Bar";
  if (part === "secondarySideBar") return "Secondary Side Bar";
  if (part === "activityBar") return "Activity Bar";
  if (part === "statusBar") return "Status Bar";
  return "Panel";
}

function toggleIcon(part: "primarySideBar" | "secondarySideBar" | "panel"): string {
  if (part === "panel") return "▰";
  if (part === "primarySideBar") return "▤";
  return "▥";
}

export function Workbench({ title, algorithmLabel, primary, editor, secondary, panel, onEditorResize }: WorkbenchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const partRefs = useRef<Partial<Record<"activityBar" | "primarySideBar" | "editor" | "secondarySideBar" | "panel", HTMLDivElement | HTMLElement | null>>>({});
  const [state, setState] = useState<WorkbenchState>(readInitialState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorSize, setEditorSize] = useState({ w: 0, h: 0 });
  const [handles, setHandles] = useState<Record<ResizePart, { left: number; top: number; width: number; height: number; hidden: boolean }>>({
    primarySideBar: { left: 0, top: 0, width: 0, height: 0, hidden: true },
    secondarySideBar: { left: 0, top: 0, width: 0, height: 0, hidden: true },
    panel: { left: 0, top: 0, width: 0, height: 0, hidden: true },
  });

  const updateState = useCallback((update: (current: WorkbenchState) => WorkbenchState) => {
    setState((current) => sanitizeWorkbenchState(update(current)));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private browsing can deny storage */ }
  }, [state]);

  const notifyEditorResize = useCallback(() => {
    const editorElement = partRefs.current.editor;
    if (!editorElement) return;
    const rect = editorElement.getBoundingClientRect();
    setEditorSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    onEditorResize?.();
    window.dispatchEvent(new Event("resize"));
  }, [onEditorResize]);

  const updateGeometry = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const nextHandles = {} as Record<ResizePart, { left: number; top: number; width: number; height: number; hidden: boolean }>;
    for (const part of ["primarySideBar", "secondarySideBar", "panel"] as const) {
      const element = partRefs.current[part];
      const rect = element?.getBoundingClientRect();
      if (!element || !rect || !state.visible[part]) {
        nextHandles[part] = { left: 0, top: 0, width: 0, height: 0, hidden: true };
        continue;
      }
      if (part === "panel") {
        nextHandles[part] = { left: rect.left - rootRect.left, top: rect.top - rootRect.top - 3, width: rect.width, height: 6, hidden: false };
      } else {
        const order = columnOrder(state);
        const beforeEditor = order.indexOf(part) < order.indexOf("editor");
        const seam = beforeEditor ? rect.right : rect.left;
        nextHandles[part] = { left: seam - rootRect.left - 3, top: rect.top - rootRect.top, width: 6, height: rect.height, hidden: false };
      }
    }
    setHandles(nextHandles);
    notifyEditorResize();
  }, [notifyEditorResize, state]);

  useLayoutEffect(() => {
    updateGeometry();
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(root);
    window.addEventListener("resize", updateGeometry);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateGeometry);
    };
  }, [updateGeometry]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) { setMenuOpen(false); return; }
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.code === "KeyB" && event.altKey) {
        event.preventDefault();
        updateState((current) => ({ ...current, visible: { ...current.visible, secondarySideBar: !current.visible.secondarySideBar } }));
      } else if (event.code === "KeyB") {
        event.preventDefault();
        updateState((current) => ({ ...current, visible: { ...current.visible, primarySideBar: !current.visible.primarySideBar } }));
      } else if (event.code === "KeyJ") {
        event.preventDefault();
        updateState((current) => ({ ...current, visible: { ...current.visible, panel: !current.visible.panel } }));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, updateState]);

  const setVisible = (part: WorkbenchPart, visible: boolean) => {
    updateState((current) => ({ ...current, visible: { ...current.visible, [part]: visible } }));
  };

  const reset = () => {
    setState({
      ...DEFAULTS,
      visible: { ...DEFAULTS.visible },
      sizes: { ...DEFAULTS.sizes },
      activeView: { primary: "scenarios", secondary: "inspector", panel: "execution" },
    });
  };

  const beginResize = (part: ResizePart, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !state.visible[part]) return;
    event.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    const key = part === "panel" ? "panelH" : part === "primarySideBar" ? "primaryW" : "secondaryW";
    const limit = LIMITS[key];
    const start = state.sizes[key];
    const origin = part === "panel" ? event.clientY : event.clientX;
    const order = columnOrder(state);
    const grow = part === "panel" ? -1 : order.indexOf(part) < order.indexOf("editor") ? 1 : -1;
    const rootRect = root.getBoundingClientRect();
    const otherWidth = (state.visible.activityBar ? ACTIVITYBAR_W : 0)
      + (part === "primarySideBar" ? (state.visible.secondarySideBar ? state.sizes.secondaryW : 0) : (state.visible.primarySideBar ? state.sizes.primaryW : 0));
    const maxByEditor = part === "panel"
      ? rootRect.height - TITLEBAR_H - (state.visible.statusBar ? STATUSBAR_H : 0) - EDITOR_MIN_H
      : rootRect.width - otherWidth - EDITOR_MIN_W;
    let collapse = false;

    const onMove = (moveEvent: PointerEvent) => {
      const pointer = part === "panel" ? moveEvent.clientY : moveEvent.clientX;
      const next = start + (pointer - origin) * grow;
      if (next < limit.min * 0.6) {
        collapse = true;
        return;
      }
      collapse = false;
      const bounded = Math.max(limit.min, Math.min(limit.max, Math.min(next, maxByEditor)));
      updateState((current) => ({ ...current, sizes: { ...current.sizes, [key]: bounded } }));
      moveEvent.preventDefault();
    };
    const onEnd = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      if (collapse) setVisible(part, false);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  };

  const order = columnOrder(state);
  const widthOf: Record<string, string> = {
    activityBar: state.visible.activityBar ? `${ACTIVITYBAR_W}px` : "0px",
    primarySideBar: state.visible.primarySideBar ? `${state.sizes.primaryW}px` : "0px",
    secondarySideBar: state.visible.secondarySideBar ? `${state.sizes.secondaryW}px` : "0px",
    editor: `minmax(${EDITOR_MIN_W}px, 1fr)`,
  };
  const span = panelColumnSpan(state);
  const partStyle = (part: "activityBar" | "primarySideBar" | "editor" | "secondarySideBar") => {
    const index = order.indexOf(part);
    const row = part === "activityBar" ? "2 / 4" : part === "editor" ? "2 / 3" : panelCovers(state, part as "primarySideBar" | "secondarySideBar") ? "2 / 3" : "2 / 4";
    return { gridColumn: `${index + 1} / ${index + 2}`, gridRow: row };
  };

  return (
    <div
      className="wb"
      ref={rootRef}
      data-primary-position={state.primaryPosition}
      data-panel-alignment={state.panelAlignment}
      data-testid="workbench"
      style={{
        gridTemplateColumns: order.map((part) => widthOf[part]).join(" "),
        gridTemplateRows: `${TITLEBAR_H}px minmax(${EDITOR_MIN_H}px, 1fr) ${state.visible.panel ? `${state.sizes.panelH}px` : "0px"} ${state.visible.statusBar ? `${STATUSBAR_H}px` : "0px"}`,
      }}
    >
      <header className="wb-titlebar" data-wb-part="titleBar">
        <div className="wb-brand"><span className="wb-brand-mark">▦</span><span>CS Note</span><b>/</b><strong>{title}</strong><em>LEARNING</em></div>
        <div className="wb-titlebar-controls">
          <button className={`wb-title-btn ${menuOpen ? "on" : ""}`} type="button" data-wb-menu-open="true" title="Customize Layout" aria-label="Customize Layout" onClick={() => setMenuOpen((open) => !open)}>⊞</button>
          {(["primarySideBar", "panel", "secondarySideBar"] as const).map((part) => <button key={part} className={`wb-title-btn ${state.visible[part] ? "on" : ""}`} type="button" data-wb-toggle={part} aria-pressed={state.visible[part]} title={`Toggle ${partLabel(part)}`} onClick={() => setVisible(part, !state.visible[part])}>{toggleIcon(part)}</button>)}
        </div>
        {menuOpen && <div className="wb-menu" data-testid="wb-menu" role="menu" onPointerDown={(event) => event.stopPropagation()}>
          <div className="wb-menu-head"><span className="wb-menu-title">Customize Layout</span><button className="wb-menu-reset" type="button" data-wb-menu-reset="true" title="Reset to defaults" onClick={reset}>↩</button></div>
          <div className="wb-menu-group"><div className="wb-menu-caption">Visibility</div>{PARTS.map((part) => <button key={part} className={`wb-menu-item ${state.visible[part] ? "on" : ""}`} type="button" data-wb-menu-visible={part} onClick={() => setVisible(part, !state.visible[part])}><span className="wb-menu-check">{state.visible[part] ? "✓" : ""}</span><span className="wb-menu-label">{partLabel(part)}</span>{part === "primarySideBar" && <kbd>⌘B</kbd>}{part === "secondarySideBar" && <kbd>⌥⌘B</kbd>}{part === "panel" && <kbd>⌘J</kbd>}</button>)}</div>
          <div className="wb-menu-group"><div className="wb-menu-caption">Primary Side Bar Position</div>{(["left", "right"] as const).map((position) => <button key={position} className={`wb-menu-item ${state.primaryPosition === position ? "on" : ""}`} type="button" data-wb-menu-position={position} onClick={() => updateState((current) => ({ ...current, primaryPosition: position }))}><span className="wb-menu-check">{state.primaryPosition === position ? "✓" : ""}</span><span className="wb-menu-label">{position === "left" ? "Left" : "Right"}</span></button>)}</div>
          <div className="wb-menu-group"><div className="wb-menu-caption">Panel Alignment</div>{(["left", "center", "right", "justify"] as const).map((alignment) => <button key={alignment} className={`wb-menu-item ${state.panelAlignment === alignment ? "on" : ""}`} type="button" data-wb-menu-align={alignment} onClick={() => updateState((current) => ({ ...current, panelAlignment: alignment }))}><span className="wb-menu-check">{state.panelAlignment === alignment ? "✓" : ""}</span><span className="wb-menu-label">{alignment[0].toUpperCase() + alignment.slice(1)}</span></button>)}</div>
        </div>}
      </header>

      <nav className="wb-activitybar" data-wb-part="activityBar" style={partStyle("activityBar")} hidden={!state.visible.activityBar} aria-label="Activity Bar">
        <div className="wb-activitybar-main"><button className="wb-activity-btn on" type="button" aria-label="Scenarios" title="Scenarios">◈</button></div>
        <div className="wb-activitybar-end"><button className="wb-activity-btn" type="button" aria-label="Settings" title="Settings">⚙</button></div>
      </nav>
      <aside className="wb-sidebar wb-primary" data-wb-part="primarySideBar" style={partStyle("primarySideBar")} hidden={!state.visible.primarySideBar} ref={(element) => { partRefs.current.primarySideBar = element; }}>{primary}</aside>
      <main className="wb-editor" data-wb-part="editor" style={partStyle("editor")} ref={(element) => { partRefs.current.editor = element; }}>{editor}</main>
      <aside className="wb-sidebar wb-secondary" data-wb-part="secondarySideBar" style={partStyle("secondarySideBar")} hidden={!state.visible.secondarySideBar} ref={(element) => { partRefs.current.secondarySideBar = element; }}>{secondary}</aside>
      <section className="wb-panel" data-wb-part="panel" style={{ gridColumn: `${span[0]} / ${span[1]}`, gridRow: "3 / 4" }} hidden={!state.visible.panel} ref={(element) => { partRefs.current.panel = element; }}>{panel}</section>
      <footer className="wb-statusbar" data-wb-part="statusBar" hidden={!state.visible.statusBar}><span data-wb-status="views">Primary: Scenarios · Secondary: Inspector · Panel: Execution</span><span data-wb-status="visible">Visible: {PARTS.filter((part) => state.visible[part]).map(partLabel).join(", ")}</span><span className="wb-status-end" data-wb-status="editor">{editorSize.w} × {editorSize.h} · {algorithmLabel}</span></footer>

      {(["primarySideBar", "secondarySideBar", "panel"] as const).map((part) => <div key={part} className={`wb-resize ${part === "panel" ? "wb-resize-y" : "wb-resize-x"}`} data-wb-resize={part} role="separator" aria-label={`Resize ${partLabel(part)}`} aria-orientation={part === "panel" ? "horizontal" : "vertical"} hidden={handles[part].hidden} style={{ left: handles[part].left, top: handles[part].top, width: handles[part].width, height: handles[part].height }} onPointerDown={(event) => beginResize(part, event)} />)}
    </div>
  );
}
