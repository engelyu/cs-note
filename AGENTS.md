# Algor Note Agent Instructions

Use complete paragraphs in user-facing responses and avoid bullet lists. Keep the product UI in English unless a task explicitly says otherwise.

Read `CONTEXT.md` and the relevant records in `docs/adr/` before changing the semantic model, execution artifacts, projections, or authoring workflow. Treat the semantic model as the source of truth; Excalidraw is a projection and layout surface.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues and are managed with `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default labels `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
