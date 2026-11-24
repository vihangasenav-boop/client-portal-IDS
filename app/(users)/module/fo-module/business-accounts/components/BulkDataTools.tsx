"use client";

import { type ChangeEvent, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Trash2,
  X,
} from "lucide-react";

type Props = {
  columns: string[];
  templateName: string;
  disabled?: boolean;
  deleteAllDisabled?: boolean;
  onDeleteAll?: () => void;
  deleteSelectedDisabled?: boolean;
  onDeleteSelected?: () => void;
  onImport: (rows: string[][]) => string | void;
};

const MAX_ROWS = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeRows(matrix: unknown[][], columns: string[]) {
  const rows = matrix.map((row) => row.map(normalizeCell));
  const header = rows[0]?.map(normalizeHeader) ?? [];
  const matchingHeaders = header.filter((value) =>
    columns.some((column) => normalizeHeader(column) === value)
  ).length;
  const hasHeader = matchingHeaders >= Math.min(2, columns.length);

  const data = hasHeader
    ? rows.slice(1).map((row) =>
        columns.map((column) => {
          const index = header.indexOf(normalizeHeader(column));
          return index >= 0 ? row[index] ?? "" : "";
        })
      )
    : (() => {
        const positionalRows = [...rows];

        while (
          positionalRows.length > 0 &&
          positionalRows.every((row) => !row[0]?.trim())
        ) {
          positionalRows.forEach((row) => row.shift());
        }

        if (
          positionalRows[0]?.length > columns.length &&
          positionalRows.every(
            (row, index) => row[0]?.trim() === String(index + 1)
          )
        ) {
          positionalRows.forEach((row) => row.shift());
        }

        return positionalRows.map((row) =>
          columns.map((_, index) => row[index] ?? "")
        );
      })();

  return data.filter((row) => row.some((value) => value !== ""));
}

function readWorksheetRows(worksheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

export default function BulkDataTools({
  columns,
  templateName,
  disabled = false,
  deleteAllDisabled = false,
  onDeleteAll,
  deleteSelectedDisabled = false,
  onDeleteSelected,
  onImport,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const importMatrix = (matrix: unknown[][]) => {
    const rows = normalizeRows(matrix, columns);

    if (rows.length === 0) {
      setError("No data rows found. Include Code and Name values.");
      return;
    }

    if (rows.length > MAX_ROWS) {
      setError(`Import is limited to ${MAX_ROWS.toLocaleString()} rows.`);
      return;
    }

    const importError = onImport(rows);
    if (importError) {
      setError(importError);
      return;
    }

    setError("");
    setNotice(`${rows.length.toLocaleString()} rows added to the review table.`);
    setPasteValue("");
    setPasteOpen(false);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setNotice("");

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("Choose a spreadsheet smaller than 5 MB.");
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        setError("The spreadsheet does not contain a worksheet.");
        return;
      }

      importMatrix(readWorksheetRows(firstSheet));
    } catch (cause) {
      console.error("Spreadsheet import failed:", cause);
      setError("Could not read that file. Upload a valid Excel or CSV file.");
    }
  };

  const handlePasteImport = () => {
    setError("");

    try {
      let matrix: unknown[][];

      if (pasteValue.includes("\t")) {
        matrix = pasteValue.split(/\r\n|\n|\r/).map((line) => line.split("\t"));
      } else {
        const workbook = XLSX.read(pasteValue, { type: "string" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!firstSheet) {
          setError("No spreadsheet data found in the pasted text.");
          return;
        }

        matrix = readWorksheetRows(firstSheet);
      }

      importMatrix(matrix);
    } catch (cause) {
      console.error("Pasted data could not be parsed:", cause);
      setError("Could not read the pasted data. Copy cells from Excel and try again.");
    }
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([columns]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${templateName}-template.xlsx`);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError("");
            setNotice("");
            setPasteOpen(true);
          }}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ClipboardPaste size={16} />
          Paste from Excel
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileSpreadsheet size={16} />
          Upload Excel
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Download template
        </button>
        {onDeleteSelected && (
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={disabled || deleteSelectedDisabled}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            Delete selected
          </button>
        )}
        {onDeleteAll && (
          <button
            type="button"
            onClick={onDeleteAll}
            disabled={disabled || deleteAllDisabled}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            Delete all data
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {pasteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPasteOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="paste-data-title"
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="paste-data-title" className="text-lg font-semibold text-slate-900">
                  Paste spreadsheet rows
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Copy the spreadsheet rows and paste them below. Use Code, Name, and Is Default columns, with or without a header row.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                aria-label="Close paste dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              rows={10}
              autoFocus
              placeholder={columns.join("\t")}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteImport}
                disabled={!pasteValue.trim()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to table
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
