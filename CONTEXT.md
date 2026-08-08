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
The reviewable unit that describes an algorithm's scenarios, tracer command artifact, projections, capabilities, and verified execution artifact.
_Avoid_: Canvas, demo, widget

## Execution language

**Execution Session**:
A replayable run of an algorithm with a cursor, ordered Trace Commands, replay frames, and tracer state.
_Avoid_: Animation, recording, screen capture

**Trace Command**:
An ordered command emitted by an algorithm's visualization library, identifying a tracer object, method, and arguments.
_Avoid_: Debugger event, DOM mutation, Excalidraw element

**Replay Frame**:
The commands and resulting tracer state between two `delay` commands in an imported Execution Session.
_Avoid_: Source line breakpoint, screenshot, call-stack frame

**Logical Component**:
A stable object in replay state, such as a graph node, edge, array cell, or log stream, that multiple projections can present in their own formats.
_Avoid_: Excalidraw element, DOM node, canvas object

**Teaching Concept**:
A named idea the lesson wants the learner to understand, such as low-link propagation, on-stack membership, or an SCC root.
_Avoid_: Variable, label, annotation

**Evidence**:
Tracer state or command data used to support a Teaching Concept, such as a visited graph node, selected edge, or log message.
_Avoid_: View data, screenshot data

**Derived Fact**:
A deterministic presentation fact computed from replay state, such as whether a graph node is visited or focused.
_Avoid_: LLM answer, visual guess

## Views and artifacts

**Projection**:
A view of replay state, such as a Canvas, Log panel, Table, Timeline, or custom teaching panel.
_Avoid_: Copy of the artifact, independent algorithm state

**Canvas Layout**:
User-adjustable presentation state such as position, size, visibility, and zoom; it never changes algorithm state.
_Avoid_: Algorithm state, semantic state

**Semantic Artifact**:
A compact, verified representation of an imported tracer command stream that the Student Runtime can load without compiling or executing source code.
_Avoid_: Raw source code, live debugger transcript

**Scenario**:
A named input and teaching path for one Visualization Package, with explicit capabilities describing what a student may change.
_Avoid_: Random example, playground
