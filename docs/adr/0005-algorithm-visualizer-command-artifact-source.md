# Algorithm Visualizer command artifacts are the MVP source of truth

Status: Accepted

CS Note uses Algorithm Visualizer-style tracer command artifacts as the execution source for the MVP. An algorithm contributes source code that emits tracer commands, and `delay` commands divide the ordered command stream into replay frames. The Student Runtime replays verified artifacts and does not compile source code, run a debugger, inspect C++ scopes, or infer semantic state from Record Points.

The reusable CS Note work is above the command stream: command validation, deterministic replay, multiple projections, Excalidraw presentation, teaching panels, layout persistence, and safe student capabilities. A visualization may present one tracer state through several projections without making Excalidraw elements the source of truth.

The former source-anchored Observation Plan, Record Point, Observation Frame, and Semantic Model authoring contract is deferred and is not part of the MVP. A future execution adapter may be considered only if a concrete product need justifies its engineering cost.

CS Note may import Algorithm Visualizer-compatible artifacts and may later import upstream algorithm content, but upstream source files must retain their original attribution and licensing. The current repository contains only an original compatibility fixture and no copied Algorithm Visualizer source code. The licensing status of the separate `algorithms` and `tracers.cpp` repositories must be clarified before copying their source files into CS Note.
