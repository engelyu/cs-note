# ADR 0006: Use a reusable VS Code-like Workbench shell

## Status

Accepted

## Context

The application will host many algorithm visualizations over several years. The shell is therefore a long-lived product surface, while an individual algorithm is a feature that should be replaceable without changing the surrounding layout. The historical `dsvisual` project already established the intended workbench behavior: Activity Bar, Primary Side Bar, Editor, Secondary Side Bar, Panel, Status Bar, resizable boundaries, persisted layout preferences, and configurable Primary Side Bar and Panel placement.

Recreating that behavior inside every visualization would duplicate layout state, keyboard shortcuts, persistence, and resize logic. It would also make the central canvas difficult to reason about because each screen could invent a different relationship between its inspector and execution controls.

## Decision

`src/workbench/Workbench.tsx` is the reusable Workbench module. It owns shell layout, visibility, keyboard shortcuts, persistence, resize handles, minimum editor dimensions, panel alignment, and the interaction boundary around the central Editor. `src/workbench/workbenchState.ts` is its pure state and geometry interface; it sanitizes persisted values and maps semantic layout choices to CSS Grid tracks.

Feature screens provide four slots through the Workbench interface: Primary Side Bar content, Editor content, Secondary Side Bar content, and Panel content. The shell is algorithm-agnostic. For the current visualizations, Excalidraw remains inside the Editor slot, inspector views remain inside the Secondary Side Bar slot, and the execution transport remains inside the bottom Panel slot.

The layout uses CSS Grid for geometry. JavaScript owns only semantic state and writes grid tracks or data attributes; it does not maintain a second rectangle layout. The Editor is never allowed to collapse. A sidebar or Panel may be collapsed by toggling visibility or by dragging its boundary below the historical minimum threshold. Layout preferences are persisted under `algor-note:workbench:v1`.

The historical `dsvisual` workbench is the behavioral reference, but the implementation is a typed React adapter rather than a direct copy of its vanilla DOM module. This keeps the seam small while matching the established layout contract.

## Consequences

New visualizations can focus on semantic state, canvas projection, and panel content without reimplementing shell behavior. The Workbench becomes a deep module with a small interface and high leverage across every future algorithm. The cost is that shell behavior must remain generic: algorithm-specific visibility rules and ad hoc panel toggles do not belong in feature screens.

The current shell intentionally leaves view registries and richer Activity Bar contributions as a future seam. The existing slots are enough for the first algorithm notebook, while the state model already preserves active view identifiers for later view-host integration.

## Verification

The pure state contract is covered by `tests/workbenchState.test.mjs`. Local browser smoke testing verifies the shell renders all parts, opens the Secondary Side Bar, changes Primary Side Bar position, changes Panel alignment, persists the resulting layout, and exposes resize boundaries.
