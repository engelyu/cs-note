type ExcalidrawElementRecord = {
  id?: unknown;
  containerId?: unknown;
  boundElements?: unknown;
  startBinding?: unknown;
  endBinding?: unknown;
  [key: string]: unknown;
};

function asElementRecord(value: unknown): ExcalidrawElementRecord | null {
  return value !== null && typeof value === "object" ? value as ExcalidrawElementRecord : null;
}

function remapReference(value: unknown, ids: Map<string, string>): unknown {
  if (value === null || typeof value !== "object") return value;
  const reference = value as { id?: unknown; [key: string]: unknown };
  if (typeof reference.id !== "string") return value;
  const nextId = ids.get(reference.id);
  return nextId ? { ...reference, id: nextId } : value;
}

export function stabilizeExcalidrawElementIds(
  converted: unknown[],
  inputIds: ReadonlySet<string>,
): unknown[] {
  const generatedLabelIds = new Map<string, string>();

  for (const element of converted) {
    const record = asElementRecord(element);
    if (
      typeof record?.id === "string" &&
      typeof record.containerId === "string" &&
      !inputIds.has(record.id)
    ) {
      generatedLabelIds.set(record.id, `label:${record.containerId}`);
    }
  }

  return converted.map((element) => {
    const record = asElementRecord(element);
    if (!record) return element;
    return {
      ...record,
      id: typeof record.id === "string" ? generatedLabelIds.get(record.id) ?? record.id : record.id,
      boundElements: Array.isArray(record.boundElements)
        ? record.boundElements.map((reference) => remapReference(reference, generatedLabelIds))
        : record.boundElements,
      startBinding: remapReference(record.startBinding, generatedLabelIds),
      endBinding: remapReference(record.endBinding, generatedLabelIds),
    };
  });
}
