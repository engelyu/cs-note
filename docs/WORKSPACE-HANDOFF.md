# Algor Note Workspace Handoff

Algor Note is the product workspace for the long-lived algorithm teaching site. This working folder was created from the clean `main` state of the existing `engelyu/cs-note` repository at commit `c38394b` (`fix: expose workbench resize boundaries`). The old `ds2026` Algoscope prototype and the original `dsvisual` application are not source inputs for this workspace.

The canonical local workspace is `/Users/engel/Documents/ChatGPT/algor-note-workspace`. The canonical GitHub repository remains `engelyu/cs-note`; this is a new local working folder and handoff branch, not a new repository. Contributors should work from this repository, keep the product UI and documentation in English, and submit changes through normal branches and pull requests.

The current implementation already contains the reusable VS Code-like Workbench shell, persisted and resizable Activity Bar, Primary Side Bar, Editor, Secondary Side Bar, Panel, and Status Bar behavior, Excalidraw as a canvas projection, Algorithm Visualizer-compatible command artifacts, replayable algorithm runtimes, and tests for observation, Tarjan, LIS, imported traces, and Workbench state.

The source of truth remains the verified execution or semantic artifact. Excalidraw remains a projection and layout surface. The next implementation task must be selected from the current repository state after running the existing build, license verification, artifact verification, and test suite. Do not reintroduce the discarded browser-hosted Code-OSS experiment or the abandoned Algoscope shell without a new decision.

Generated dependencies and build output are intentionally absent from the initial handoff. Run `npm install` followed by `npm test` to restore and verify the local environment.
