export type SourceAnchor =
  | { kind: "line"; file: string; line: number; column?: number }
  | { kind: "function-entry"; file: string; functionName: string }
  | { kind: "function-exit"; file: string; functionName: string; returnId: string };

export type RecordPoint = {
  id: string;
  anchor: SourceAnchor;
  label?: string;
};

export type ObservationPlan = {
  id: string;
  recordPoints: readonly RecordPoint[];
  inputFields: readonly string[];
};

export type CallStackContext = {
  callStackId?: string;
  parentCallStackId?: string;
  callDepth?: number;
  functionName?: string;
};

export type ObservationFrame = {
  sequence: number;
  recordPointId: string;
  anchor: SourceAnchor;
  values: Readonly<Record<string, unknown>>;
  context?: Readonly<CallStackContext>;
};

export type SemanticInputContract = {
  fields: readonly string[];
  contextFields?: readonly (keyof CallStackContext)[];
};

export type SemanticInputFrame = Omit<ObservationFrame, "values" | "context"> & {
  values: Readonly<Record<string, unknown>>;
  context: Readonly<CallStackContext>;
};

export type SemanticModel<State> = {
  id: string;
  input: SemanticInputContract;
  mapFrame: (frame: SemanticInputFrame) => State;
};

function assertNonEmpty(value: string, description: string): void {
  if (value.trim().length === 0) throw new Error(`${description} must not be empty`);
}

function assertPositiveInteger(value: number, description: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${description} must be a positive integer`);
}

function sourceAnchorKey(anchor: SourceAnchor): string {
  return JSON.stringify(anchor);
}

function validateSourceAnchor(anchor: SourceAnchor): void {
  assertNonEmpty(anchor.file, "Source anchor file");
  if (anchor.kind === "line") {
    assertPositiveInteger(anchor.line, "Source anchor line");
    if (anchor.column !== undefined) assertPositiveInteger(anchor.column, "Source anchor column");
    return;
  }

  assertNonEmpty(anchor.functionName, "Source anchor function name");
  if (anchor.kind === "function-exit") assertNonEmpty(anchor.returnId, "Source anchor return id");
}

function validateUniqueNames(values: readonly string[], description: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assertNonEmpty(value, `${description} name`);
    if (seen.has(value)) throw new Error(`${description} names must be unique: ${value}`);
    seen.add(value);
  }
}

export function validateObservationPlan(plan: ObservationPlan): void {
  assertNonEmpty(plan.id, "Observation Plan id");
  if (plan.recordPoints.length === 0) throw new Error("Observation Plan must define at least one Record Point");
  validateUniqueNames(plan.inputFields, "Observation input field");

  const pointIds = new Set<string>();
  for (const point of plan.recordPoints) {
    assertNonEmpty(point.id, "Record Point id");
    if (pointIds.has(point.id)) throw new Error(`Record Point ids must be unique: ${point.id}`);
    pointIds.add(point.id);
    validateSourceAnchor(point.anchor);
  }
}

export function validateSemanticModelCompatibility<State>(
  plan: ObservationPlan,
  model: SemanticModel<State>,
): void {
  assertNonEmpty(model.id, "Semantic Model id");
  validateUniqueNames(model.input.fields, "Semantic input field");
  const availableFields = new Set(plan.inputFields);
  const missingFields = model.input.fields.filter((field) => !availableFields.has(field));
  if (missingFields.length > 0) {
    throw new Error(`Semantic Model ${model.id} requires uncaptured input fields: ${missingFields.join(", ")}`);
  }

  const contextFields = model.input.contextFields ?? [];
  validateUniqueNames(contextFields, "Semantic context field");
}

export function validateObservationFrames(
  plan: ObservationPlan,
  frames: readonly ObservationFrame[],
): void {
  validateObservationPlan(plan);
  const recordPoints = new Map(plan.recordPoints.map((point) => [point.id, point]));
  const inputFields = new Set(plan.inputFields);

  for (const [expectedSequence, frame] of frames.entries()) {
    if (frame.sequence !== expectedSequence) {
      throw new Error(`Observation Frame sequence must be contiguous at ${expectedSequence}`);
    }

    const point = recordPoints.get(frame.recordPointId);
    if (!point) throw new Error(`Observation Frame references unknown Record Point: ${frame.recordPointId}`);
    if (sourceAnchorKey(frame.anchor) !== sourceAnchorKey(point.anchor)) {
      throw new Error(`Observation Frame anchor does not match Record Point: ${frame.recordPointId}`);
    }

    for (const field of Object.keys(frame.values)) {
      if (!inputFields.has(field)) {
        throw new Error(`Observation Frame captured undeclared input field: ${field}`);
      }
    }
  }
}

export function selectSemanticInputs(
  frame: ObservationFrame,
  input: SemanticInputContract,
): SemanticInputFrame {
  const values: Record<string, unknown> = {};
  for (const field of input.fields) {
    if (Object.hasOwn(frame.values, field)) values[field] = frame.values[field];
  }

  const context: Record<string, unknown> = {};
  for (const field of input.contextFields ?? []) {
    const value = frame.context?.[field];
    if (value !== undefined) context[field] = value;
  }

  return { ...frame, values, context: context as CallStackContext };
}

export function mapObservationFrame<State>(
  model: SemanticModel<State>,
  frame: ObservationFrame,
): State {
  return model.mapFrame(selectSemanticInputs(frame, model.input));
}

export function mapObservationFrames<State>(
  plan: ObservationPlan,
  model: SemanticModel<State>,
  frames: readonly ObservationFrame[],
): State[] {
  validateSemanticModelCompatibility(plan, model);
  validateObservationFrames(plan, frames);
  return frames.map((frame) => mapObservationFrame(model, frame));
}
