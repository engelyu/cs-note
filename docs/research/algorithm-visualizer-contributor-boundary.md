# Algorithm Visualizer Contributor Boundary

Date: 2026-08-08

## Research question

How does Algorithm Visualizer divide responsibility between the public student-facing website, the people who contribute algorithm content, and the maintainers of the execution and visualization platform? The purpose of this research is to use an established project as a reference for defining the contributor boundary in Algor Note.

## Findings

Algorithm Visualizer is not organized as one repository in which every participant edits the same kind of object. Its main repository describes four distinct responsibilities. The `algorithm-visualizer` repository is the React web application and interprets visualization commands into UI visualizations. The `server` repository provides runtime APIs such as GitHub sign-in and code compilation or execution. The `algorithms` repository contains the algorithm visualizations shown in the website side menu and therefore contains the educational content. The `tracers.*` repositories provide language-specific visualization libraries that extract visualization commands from algorithm code. This is an explicit repository-level separation of platform, execution service, content, and visualization primitives.

Sources: [Algorithm Visualizer main repository](https://github.com/algorithm-visualizer/algorithm-visualizer) and its [README](https://raw.githubusercontent.com/algorithm-visualizer/algorithm-visualizer/master/README.md).

The content contributor works primarily in the `algorithms` repository. The repository currently organizes content by category and algorithm directory, with language-specific source files and a README for each algorithm. Its contributor guide asks a contributor to learn the tracer libraries, test the code repeatedly in the website's Scratch Paper, fork the repository, create an algorithm-specific branch, edit or add the algorithm files, and submit a pull request. The guide states that the change appears on the public website only after review and merge. This makes the contributor a repository author rather than a person who designs or publishes content during a student session.

Sources: [Algorithm Visualizer algorithms repository](https://github.com/algorithm-visualizer/algorithms) and its [contributor guide](https://github.com/algorithm-visualizer/algorithms/blob/master/CONTRIBUTING.md).

Algorithm Visualizer's algorithm source and visualization instructions are coupled at authoring time. The JavaScript tracer library is used directly from the algorithm program. A contributor creates tracer objects, updates them while the algorithm runs, and calls `Tracer.delay()` to define observable execution points. The runtime later interprets the resulting visualization commands. In other words, the contributor does not merely select variables from an independent debugger transcript; the algorithm code explicitly emits the information that the visualization runtime consumes.

Source: [tracers.js README](https://raw.githubusercontent.com/algorithm-visualizer/tracers.js/master/README.md).

The execution boundary is separate from the content boundary. The server contributor guide identifies models that manage algorithm visualizations and their hierarchy, and tracers that build visualization libraries and compile or run code. It also documents a special JavaScript path in which the browser receives a web worker and extracts visualization commands locally, while other languages use server-side execution infrastructure. This reinforces that execution and command extraction are platform responsibilities, not responsibilities that every algorithm contributor must redesign.

Source: [Algorithm Visualizer server contributor guide](https://github.com/algorithm-visualizer/server/blob/master/CONTRIBUTING.md).

Scratch Paper is an important but limited boundary. It gives contributors a fast place to run their own code and validate tracer behavior before opening a pull request. It is therefore an authoring and verification aid exposed by the public site, but it is not the publication mechanism and it does not turn the public site into an online repository editor. Publication still happens through a reviewed repository change.

## Boundary model extracted from the project

The project has four practical roles. The platform maintainer owns the web application and its projections. The execution maintainer owns compilation, workers, server APIs, and the tracer integration. The content contributor owns the algorithm source, the visualization commands or tracer usage, explanatory material, and the content directory structure. The student owns only the runtime interaction offered by the published visualization, such as replaying the execution and exploring the available views.

The strongest boundary is not between “code” and “visualization”; it is between “published content” and “platform capabilities.” A content contributor can use the platform's existing tracer vocabulary to describe an algorithm, but changing the tracer system or the way code is executed is a platform contribution. A student can use Scratch Paper to experiment, but cannot change the published side-menu content without a repository contribution.

## Implications for Algor Note

The repository split supports our existing decision that a Contributor works locally and submits a pull request, while the Student Runtime consumes reviewed content. Algor Note should preserve a clear distinction between the reusable platform and a Visualization Package that teaches one algorithm or family of scenarios. The public site should load a verified package and expose only the safe capabilities declared by that package; it should not be the place where a contributor permanently designs or publishes a visualization.

The main difference is that Algor Note does not want to make visualization commands part of the algorithm implementation. Our chosen authoring contract is closer to a debugger workflow. A contributor supplies source code, selects source-anchored Record Points, declares the input fields to capture, and provides a Semantic Model mapping from each captured Observation Frame to logical state. The debugger or execution adapter produces the evidence, the Semantic Model gives that evidence educational meaning, and the Student Runtime renders projections such as the canvas, variables panel, call stack, or timeline.

This means that Algor Note's likely content boundary is the following. The contributor owns the source program, scenarios and inputs, Record Points, captured field names, semantic mapping, teaching concepts, and the initial layout or projection configuration. The platform owns debugger adapters, observation validation, artifact generation, replay, projection implementations, permission enforcement, and performance limits. The student owns replay position, allowed view toggles, and layout changes, but not the algorithm state or the contributor's observation contract.

The Algorithm Visualizer precedent does not prove that Algor Note must use a separate content repository. It does show that the repository boundary should make the distinction visible and reviewable. For the current project, keeping platform code and Visualization Packages in one repository is acceptable if package files have a stable directory and schema, validation runs in CI, and contributor documentation clearly identifies which files are content authoring surfaces and which files are platform internals. A future split into a platform repository and a content repository remains possible if package volume or contributor scale makes it useful.

## Decision for the next discussion

We should not copy Algorithm Visualizer's tracer-coupled authoring model merely because its repository split is useful. We should copy its contributor boundary: local authoring, a small content unit, a repeatable local test workflow, and publication only through reviewed pull requests. Algor Note should retain its own debugger-derived authoring model: source code plus Record Points plus semantic mapping. The next architectural question is therefore not whether contributors can edit online; that boundary is settled. The question is which files belong to a Visualization Package and which platform services must remain behind the package interface.

## Source list

[Algorithm Visualizer website](https://algorithm-visualizer.org/)

[Algorithm Visualizer main repository](https://github.com/algorithm-visualizer/algorithm-visualizer)

[Algorithm Visualizer algorithms repository](https://github.com/algorithm-visualizer/algorithms)

[Algorithms contributor guide](https://github.com/algorithm-visualizer/algorithms/blob/master/CONTRIBUTING.md)

[tracers.js README](https://raw.githubusercontent.com/algorithm-visualizer/tracers.js/master/README.md)

[Server contributor guide](https://github.com/algorithm-visualizer/server/blob/master/CONTRIBUTING.md)
