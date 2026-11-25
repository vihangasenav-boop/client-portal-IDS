import type {
  ClipboardEvent as ReactClipboardEvent,
  Dispatch,
  SetStateAction,
} from "react";

export type GridPasteColumn<T> = {
  key: string;
  headers: string[];
  apply: (row: T, value: string) => T;
};

type PasteGridIntoRowsOptions<T> = {
  startRow: number;
  startField: string;
  clipboardText: string;
  columns: GridPasteColumn<T>[];
  createRow: (existingRows: T[]) => T;
  setRows: Dispatch<SetStateAction<T[]>>;
};

export function pasteGridIntoRows<T>({
  startRow,
  startField,
  clipboardText,
  columns,
  createRow,
  setRows,
}: PasteGridIntoRowsOptions<T>): boolean {
  if (!clipboardText.includes("\t") && !/[\r\n]/.test(clipboardText)) {
    return false;
  }

  let matrix = clipboardText
    .split(/\r\n|\n|\r/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (matrix.length === 0) return true;

  const normalizeHeader = (value: string) =>
    value
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const normalizedHeaders = matrix[0].map(normalizeHeader);
  const headerMappings = columns
    .map((column) => ({
      column,
      sourceIndex: normalizedHeaders.findIndex((header) =>
        column.headers.some((alias) => normalizeHeader(alias) === header)
      ),
    }))
    .filter((mapping) => mapping.sourceIndex >= 0);
  const hasHeader = headerMappings.length >= 2;

  let mappings: Array<{ column: GridPasteColumn<T>; sourceIndex: number }>;
  if (hasHeader) {
    mappings = headerMappings;
    matrix = matrix.slice(1);
  } else {
    while (matrix.length > 0 && matrix.every((row) => !row[0])) {
      matrix = matrix.map((row) => row.slice(1));
    }

    if (
      (matrix[0]?.length ?? 0) > columns.length &&
      matrix.every((row, index) => row[0] === String(index + 1))
    ) {
      matrix = matrix.map((row) => row.slice(1));
    }

    const startColumnIndex = columns.findIndex(
      (column) => column.key === startField
    );
    if (startColumnIndex < 0) return false;
    mappings = columns
      .slice(startColumnIndex)
      .map((column, sourceIndex) => ({ column, sourceIndex }));
  }

  if (matrix.length === 0) return true;

  setRows((previous) => {
    const next = [...previous];
    matrix.forEach((cells, rowOffset) => {
      const targetIndex = startRow + rowOffset;
      let updated = next[targetIndex] ?? createRow(next);
      mappings.forEach(({ column, sourceIndex }) => {
        if (sourceIndex < cells.length) {
          updated = column.apply(updated, cells[sourceIndex] ?? "");
        }
      });
      next[targetIndex] = updated;
    });
    return next;
  });

  return true;
}

export function handleGridPasteEvent(
  event: ReactClipboardEvent<HTMLTableElement>,
  isLocked: boolean,
  onPasteGrid: (
    rowIndex: number,
    field: string,
    clipboardText: string
  ) => boolean
) {
  if (isLocked) return;

  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement)
  ) {
    return;
  }

  const rowIndex = Number(target.dataset.gridRow);
  const field = target.dataset.gridField;
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || !field) return;

  const clipboardText = event.clipboardData.getData("text/plain");
  if (onPasteGrid(rowIndex, field, clipboardText)) {
    event.preventDefault();
  }
}
