# Source-anchored observation and semantic mapping

Status: Superseded by ADR 0005

Algor Note uses source-anchored Observation Plans as the authoring contract for visualization timelines. A Record Point placed at a source line, function entry, or specific return site creates one ordered Observation Frame each time execution reaches it; an unreachable point is simply absent from the trace. The plan captures explicitly named inputs rather than scanning an entire scope. The Semantic Model consumes that input contract and maps each frame to logical semantic state; it does not define frame boundaries or depend on debugger-specific scope handling. This keeps authoring close to the familiar debugger workflow: a Contributor supplies source code, Record Points, and a frame-to-logical-state mapping, while Graph, Stack, Table, and Excalidraw remain projections of the resulting model.

Call-stack identity and source context are recorded as optional Observation Frame metadata so recursive executions can be distinguished without making them required inputs for every Semantic Model. Object expansion limits remain a separate capture policy rather than a reason to introduce scope slicing.
