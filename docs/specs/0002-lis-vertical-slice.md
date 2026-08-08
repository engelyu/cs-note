# Specification: LIS Vertical Slice

## Problem Statement

CS Note needs a second algorithm package that exercises sequence and dynamic-programming evidence without recursion or graph-specific state. Longest Increasing Subsequence is the next validation slice because it requires a table of derived values, predecessor relationships, a global result, and a reconstruction pass while keeping the same replayable debugger contract.

## Solution

Deliver one deterministic LIS Scenario using the O(n²) dynamic-programming recurrence. The Semantic Model contains the input values, `dp[]`, `prev[]`, the current index, the comparison index, the current predecessor pair, the best endpoint, and the reconstructed sequence. The Canvas renders sequence cells and predecessor arrows. Variables, Concepts, and Timeline are projections of the current Execution Frame; a recursive Call Stack is intentionally not declared because this algorithm does not use recursion in this scenario.

The curated Scenario is algorithm-state read-only. Students may move and resize sequence cells, hide optional panels, and step through the verified artifact, but they cannot change values, `dp[]`, predecessor links, colors, or the reconstructed result. The runtime consumes the checked-in artifact and does not execute arbitrary user code.

## Teaching Concepts

The package exposes `dp[i]` as the best increasing subsequence ending at position `i`, `predecessor` as the link used to extend a candidate, `global best` as the longest endpoint discovered so far, and `reconstruction` as the reverse walk through `prev[]` that produces one answer.

The example input is `[10, 22, 9, 33, 21, 50, 41, 60]`. The expected reconstructed subsequence is `[10, 22, 33, 50, 60]`, with length five. The trace includes explicit comparisons, updates, skipped candidates, best-endpoint decisions, reconstruction frames, and completion.

## Out of Scope

This slice does not implement patience sorting, arbitrary user input, runtime reruns, custom comparison policies, lesson content, or debugger extraction from C++. Those remain future package scenarios or authoring-time extensions.
