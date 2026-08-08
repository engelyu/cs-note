# CS Note

CS Note is an English-first computer science teaching site where algorithms are taught through replayable execution and multiple visual projections. The current focus is algorithm visualization; the model is intentionally shaped so later subjects can add their own execution sources without changing the student-facing runtime.

## Product roles

**Student Runtime**:
The published website that replays verified visualization artifacts and exposes safe interaction such as view toggles and layout changes.
_Avoid_: Authoring tool, live designer, online builder

**Contributor**:
A person working in a cloned repository who creates or changes a visualization through a pull request.
_Avoid_: Website user, runtime designer

**Visualization Package**:
The reviewable unit that describes an algorithm's scenarios, semantic concepts, projections, capabilities, and verified execution artifact.
_Avoid_: Canvas, demo, widget

## Execution language

**Execution Session**:
A replayable run of an algorithm with a cursor, ordered events, semantic state, and focus targets.
_Avoid_: Animation, recording, screen capture

**Execution Frame**:
A semantic snapshot at one position in an Execution Session, paired with the event that explains how the session reached it.
_Avoid_: Screenshot, canvas state

**Semantic Model**:
The algorithm-specific entities, relations, values, and facts that explain an Execution Session; it is the source of truth for every view.
_Avoid_: Excalidraw scene, DOM state

**Teaching Concept**:
A named idea the lesson wants the learner to understand, such as low-link propagation, on-stack membership, or an SCC root.
_Avoid_: Variable, label, annotation

**Evidence**:
Debugger or generator data used to support a Teaching Concept, such as a variable, call-stack frame, or execution event.
_Avoid_: View data, screenshot data

**Derived Fact**:
A deterministic semantic result computed from one or more pieces of Evidence, such as `onStack(v)` derived from stack membership or flags.
_Avoid_: LLM answer, visual guess

## Views and artifacts

**Projection**:
A view of the Semantic Model, such as a Canvas, Variables panel, Call Stack, Table, or Timeline.
_Avoid_: Copy of the model, independent state

**Canvas Layout**:
User-adjustable presentation state such as position, size, visibility, and zoom; it never changes algorithm state.
_Avoid_: Algorithm state, semantic state

**Semantic Artifact**:
A compact, verified representation of an Execution Session that the Student Runtime can load without running a compiler or debugger.
_Avoid_: Raw debugger log, source code dump

**Scenario**:
A named input and teaching path for one Visualization Package, with explicit capabilities describing what a student may change.
_Avoid_: Random example, playground
