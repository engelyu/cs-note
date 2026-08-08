# Red-Black Tree Import Research

Date: 2026-08-09

## Research question

Does the official Algorithm Visualizer project publish a Red-Black Tree visualization artifact that emits tracer commands, and can Algor Note import it without copying an unlicensed upstream source file?

## Executive conclusion

As of 2026-08-09, no official Red-Black Tree visualization artifact was found in the official Algorithm Visualizer GitHub organization. The exact Red-Black Tree source path is therefore: none. The official `algorithm-visualizer/algorithms` repository was inspected at commit `fe3adcf890da652e5cda842d7f90b50fa7242e3a`, its complete available history was searched for `red-black`, `redblack`, and `rbtree`, and the default branches of the other official organization repositories were checked for the same path patterns. No matching artifact exists in the inspected official sources.

The closest official tree visualization is the Binary Search Tree insertion example at `Branch and Bound/Binary Search Tree/insertion.js`. It is useful for testing the importer boundary, but it is not a Red-Black Tree implementation and should not be presented as one. The immediate recommendation is not to copy any Algorithm Visualizer algorithm source or generated command artifact into Algor Note. The `algorithms` repository does not publish a license file, and its separate content cannot be assumed to inherit the MIT license published by the main web repository.

## Official repository search

The official organization currently exposes the main web application, the `algorithms` content repository, the JavaScript, Java, C++, and Python tracer repositories, the server, the slideshow, and the language-specific extractors. The organization repository listing is available through the [official GitHub organization API](https://api.github.com/orgs/algorithm-visualizer/repos?per_page=100).

The current `algorithms` tree contains category directories such as `Backtracking`, `Branch and Bound`, `Brute Force`, `Divide and Conquer`, `Dynamic Programming`, `Greedy`, `Simple Recursive`, and `Uncategorized`. Its [complete recursive tree](https://api.github.com/repos/algorithm-visualizer/algorithms/git/trees/master?recursive=1) contains no path matching `red-black`, `redblack`, or `rbtree`. The [repository root](https://github.com/algorithm-visualizer/algorithms/tree/master) describes the repository as the source of the visualizations shown in the Algorithm Visualizer side menu.

The complete history available in the repository was also searched for those names. It contains no historical Red-Black Tree path. This means there is no official source file, README, command artifact, or historical commit that can be selected as the requested import target from the official repositories inspected here.

## Closest official tree artifact

The closest usable official source is [`Branch and Bound/Binary Search Tree/insertion.js`](https://github.com/algorithm-visualizer/algorithms/blob/fe3adcf890da652e5cda842d7f90b50fa7242e3a/Branch%20and%20Bound/Binary%20Search%20Tree/insertion.js) at the inspected `algorithms` commit. The program builds an ordinary binary search tree by inserting the values in `elements`; it does not maintain node colors, black heights, rotations, recoloring, sentinel leaves, or Red-Black Tree fix-up cases. It therefore cannot serve as a Red-Black Tree teaching artifact.

The source creates a `GraphTracer`, an `Array1DTracer`, and a `LogTracer`, then places them under a `VerticalLayout`. During insertion it emits graph visits and leaves, node and edge creation, node selection and deselection, array selection and deselection, and log messages. It also emits `Tracer.delay()` between observable steps and calls `graphTracer.layoutTree(...)` for the graph layout. The accompanying [Binary Search Tree README](https://github.com/algorithm-visualizer/algorithms/blob/fe3adcf890da652e5cda842d7f90b50fa7242e3a/Branch%20and%20Bound/Binary%20Search%20Tree/README.md) documents the educational algorithm as BST insertion, not Red-Black Tree insertion.

## Command shape

The official JavaScript tracer library serializes every operation as an object with `key`, `method`, and `args` fields. The [`Commander.ts` implementation](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/Commander.ts) generates a random key for each tracer or layout object, emits constructor commands using the class name as the method, and emits later instance calls using the object's key. The official tracer source therefore has the same basic envelope as Algor Note's current `AlgorithmVisualizerCommand` type.

The delay boundary is also compatible with the current design. [`Tracer.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/Tracer.ts) emits `{ key: null, method: "delay", args: [] }` for an ordinary delay and includes a line number in `args` when `Tracer.delay(lineNumber)` is used. Algor Note's importer already treats those commands as frame boundaries.

For the closest BST artifact, the GraphTracer methods are `layoutTree`, `addNode`, `addEdge`, `visit`, `leave`, `select`, `deselect`, and `log`. The GraphTracer API is defined in the official [`GraphTracer.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/GraphTracer.ts). The Array1DTracer methods are `set`, `select`, and `deselect`, with additional `patch`, `depatch`, and `chart` methods available in the official [`Array1DTracer.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/Array1DTracer.ts). The LogTracer emits `println`; its complete method set is defined in [`LogTracer.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/LogTracer.ts). `Layout.setRoot(...)` and `VerticalLayout` emit layout commands defined in [`Layout.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/Layout.ts) and [`VerticalLayout.ts`](https://github.com/algorithm-visualizer/tracers.js/blob/4db510da800039a9f544e02d32b454428f682c8f/src/VerticalLayout.ts).

## Redistributability and license recommendation

The main Algorithm Visualizer web repository publishes an MIT license in its [official LICENSE file](https://raw.githubusercontent.com/algorithm-visualizer/algorithm-visualizer/master/LICENSE). The JavaScript tracer library also publishes an MIT license in its [official LICENSE file](https://raw.githubusercontent.com/algorithm-visualizer/tracers.js/master/LICENSE). Those licenses apply to the repositories that publish them; they do not automatically license the algorithm content stored in the separate `algorithm-visualizer/algorithms` repository.

The `algorithms` repository has no root `LICENSE`, `COPYING`, or `NOTICE` file in the inspected tree. The direct [algorithms LICENSE URL](https://raw.githubusercontent.com/algorithm-visualizer/algorithms/master/LICENSE) returns `404 Not Found`. The C++ tracer repository likewise has no root license file in its inspected tree; its direct [tracers.cpp LICENSE URL](https://raw.githubusercontent.com/algorithm-visualizer/tracers.cpp/master/LICENSE) also returns `404 Not Found`. The absence of a published license is not permission to copy, modify, or redistribute the repository's source code.

The recommendation is to treat both the upstream algorithm source and any generated artifact derived from that source as unavailable for redistribution until the repository owner adds an explicit license or grants written permission covering reuse in Algor Note. If Algor Note uses the MIT-licensed JavaScript tracer library itself, its MIT copyright and permission notice must be preserved. This is a separate decision from importing the unlicensed algorithm content.

## Compatibility with Algor Note's current importer

Algor Note's current importer is [`src/algorithmVisualizer/trace.ts`](https://github.com/engelyu/cs-note/blob/main/src/algorithmVisualizer/trace.ts). It validates the `{ key, method, args }` envelope, splits frames at `delay`, replays GraphTracer state, and replays LogTracer output. The supported GraphTracer state methods include `directed`, `weighted`, `reset`, `set`, `addNode`, `updateNode`, `removeNode`, `addEdge`, `updateEdge`, `removeEdge`, `visit`, `leave`, `select`, and `deselect`. It recognizes `layoutTree`, `layoutRandom`, and `log` as no-op commands because Algor Note owns the projection layout and log aggregation. It also supports the constructor and lifecycle commands needed by the current fixture, including `GraphTracer`, `LogTracer`, `setRoot`, and `destroy`.

The closest official BST artifact is not directly importable. Its first tracer declarations include `Array1DTracer` and its layout declaration includes `VerticalLayout`. Algor Note's importer does not currently create Array1DTracer or Array2DTracer objects, does not replay array `set` or array selection state, and does not create layout objects. An unmodified BST artifact would therefore fail when the replay encounters those constructor commands rather than merely losing a cosmetic detail.

The GraphTracer portion is substantially compatible. `addNode`, `addEdge`, `visit`, `leave`, `select`, and `deselect` are already represented in Algor Note's graph state, and the default directed-graph behavior matches the official web renderer's GraphTracer initialization. `layoutTree` is intentionally not reproduced because Algor Note preserves contributor layout through its Excalidraw projection. The remaining gap is therefore not a debugger or execution problem; it is the need for reusable array and layout projections if Algor Note later imports a multi-tracer artifact.

The official C++ tracer uses the same command envelope and exposes the same core GraphTracer vocabulary, including optional node and edge counters, as shown in its [`Commander.h`](https://github.com/algorithm-visualizer/tracers.cpp/blob/66a24e212c1be88d0771a5a19901d27a5ddaf307/include/algorithm-visualizer/Commander.h), [`Tracer.h`](https://github.com/algorithm-visualizer/tracers.cpp/blob/66a24e212c1be88d0771a5a19901d27a5ddaf307/include/algorithm-visualizer/Tracer.h), and [`GraphTracer.h`](https://github.com/algorithm-visualizer/tracers.cpp/blob/66a24e212c1be88d0771a5a19901d27a5ddaf307/include/algorithm-visualizer/GraphTracer.h). However, no official C++ Red-Black Tree algorithm source was found, and the C++ tracer repository's license status must be resolved independently before its source is vendored.

## Decision and implementation outcome

This research did not justify adding an upstream Red-Black Tree artifact to Algor Note. We therefore added an original Red-Black Tree command fixture authored in Algor Note's compatible envelope. It uses the existing GraphTracer operations for nodes, edges, selection, and rotations, plus one explicit Algor Note extension, `setNodeColor(nodeId, color)`, because the official GraphTracer vocabulary has no node-color operation. The fixture tests whether the replay, red-black projection, Excalidraw layout persistence, and selection inspector are reusable without copying an unlicensed upstream algorithm source.

The fixture is intentionally presented as an original Algor Note trace, not as an imported official Algorithm Visualizer artifact. A separately licensed upstream implementation may still be useful for checking algorithm cases later, but it is not required for this visualization seam experiment.

## Source list

[Algorithm Visualizer organization repositories](https://api.github.com/orgs/algorithm-visualizer/repos?per_page=100)

[Algorithm Visualizer algorithms repository](https://github.com/algorithm-visualizer/algorithms/tree/master)

[Algorithm Visualizer algorithms recursive tree](https://api.github.com/repos/algorithm-visualizer/algorithms/git/trees/master?recursive=1)

[Closest official BST source](https://github.com/algorithm-visualizer/algorithms/blob/fe3adcf890da652e5cda842d7f90b50fa7242e3a/Branch%20and%20Bound/Binary%20Search%20Tree/insertion.js)

[Official JavaScript tracer source](https://github.com/algorithm-visualizer/tracers.js/tree/4db510da800039a9f544e02d32b454428f682c8f/src)

[Official C++ tracer source](https://github.com/algorithm-visualizer/tracers.cpp/tree/66a24e212c1be88d0771a5a19901d27a5ddaf307/include/algorithm-visualizer)

[Algorithm Visualizer main repository MIT license](https://raw.githubusercontent.com/algorithm-visualizer/algorithm-visualizer/master/LICENSE)

[Algorithm Visualizer JavaScript tracer MIT license](https://raw.githubusercontent.com/algorithm-visualizer/tracers.js/master/LICENSE)

[Algorithms repository license path checked](https://raw.githubusercontent.com/algorithm-visualizer/algorithms/master/LICENSE)

[C++ tracer repository license path checked](https://raw.githubusercontent.com/algorithm-visualizer/tracers.cpp/master/LICENSE)
