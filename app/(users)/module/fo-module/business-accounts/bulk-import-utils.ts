let nextDraftId = -1;

export function createDraftId() {
  return nextDraftId--;
}

export function parseImportBoolean(value: string | undefined) {
  return ["1", "true", "yes", "y"].includes(
    (value ?? "").trim().toLowerCase()
  );
}
