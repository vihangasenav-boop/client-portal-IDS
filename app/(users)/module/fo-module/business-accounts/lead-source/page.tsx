"use client";

import { useEffect, useRef, useState } from "react";
import BulkDataTools from "../components/BulkDataTools";
import { createDraftId, parseImportBoolean } from "../bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import LeadSourceTable from "./components/LeadSourceTable";
import { useLeadSources } from "./hooks/useLeadSources";
import { LeadSource } from "./type";

export default function LeadSourcePage() {
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const initialLoadHandled = useRef(false);
  const {
    rows,
    setRows,
    errors,
    isLoading,
    isSaving,
    loadError,
    save,
  } = useLeadSources();

  useEffect(() => {
    if (isLoading || initialLoadHandled.current) return;

    const timeoutId = window.setTimeout(() => {
      initialLoadHandled.current = true;
      if (rows.some((row) => row.id > 0)) {
        setIsTableLocked(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, rows]);

  const handleSave = async () => {
    if (await save()) {
      setIsTableLocked(true);
    }
  };

  // -----------------------------------------
  // Change row
  // -----------------------------------------

  const handleChange = (
    id: number,
    field: keyof LeadSource,
    value: string | boolean
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // -----------------------------------------
  // Add row
  // -----------------------------------------

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),
        code: "",
        name: "",
        isDefault: false,
        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported = data.map(([code, name, isDefault]) => ({
      id: createDraftId(),
      code: code ?? "",
      name: name ?? "",
      isDefault: parseImportBoolean(isDefault),
      selected: false,
    }));

    setRows((previous) => [
      ...previous.filter((row) => row.code.trim() || row.name.trim()),
      ...imported,
    ]);
  };

  const pasteIntoGrid = (
    startRow: number,
    startField: string,
    clipboardText: string
  ) =>
    pasteGridIntoRows({
      startRow,
      startField,
      clipboardText,
      setRows,
      columns: [
        {
          key: "code",
          headers: ["Code", "Lead Source Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Lead Source Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
        {
          key: "isDefault",
          headers: ["Is Default", "Default"],
          apply: (row, value) => ({
            ...row,
            isDefault: parseImportBoolean(value),
          }),
        },
      ],
      createRow: () => ({
        id: createDraftId(),
        code: "",
        name: "",
        isDefault: false,
        selected: false,
      }),
    });

  // -----------------------------------------
  // Remove row
  // -----------------------------------------

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete lead source "${row.name || row.code}"?`)) return;

      try {
        const response = await fetch(
          `/api/modules/fom/lead-source?id=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not delete lead source.");
        }
      } catch (error) {
        console.error("Delete lead source failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete lead source.");
        return;
      }
    }

    setRows((previous) =>
      previous.filter(
        (row) => row.id !== id
      )
    );
  };

  // -----------------------------------------
  // Select all
  // -----------------------------------------

  const selectAll = (
    checked: boolean
  ) => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        selected: checked,
      }))
    );
  };

  const deleteSelectedRows = async () => {
    const selectedRows = rows.filter((row) => row.selected);
    if (selectedRows.length === 0) return;

    if (!window.confirm(`Delete ${selectedRows.length} selected lead source row(s)?`)) {
      return;
    }

    const savedIds = selectedRows.flatMap((row) => row.id > 0 ? [row.id] : []);
    const selectedIds = new Set(selectedRows.map((row) => row.id));
    setIsDeletingSelected(true);

    try {
      if (savedIds.length > 0) {
        const response = await fetch("/api/modules/fom/lead-source", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: savedIds }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not delete selected lead sources.");
        }
      }

      setRows((previous) => previous.filter((row) => !selectedIds.has(row.id)));
    } catch (error) {
      console.error("Delete selected lead sources failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete selected lead sources.");
    } finally {
      setIsDeletingSelected(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Business accounts
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Lead Sources
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track where business leads originate, including referrals and online channels.
            </p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Is Default"]}
            templateName="lead-sources"
            disabled={isLoading || isSaving || isDeletingSelected}
            importDisabled={isTableLocked}
            instructions={[
              "Code is required, must be unique, and cannot exceed 8 characters.",
              "Name is required, must be unique, and must be at least 2 characters.",
              "Use Yes or No for Is Default.",
              "Keep the template column headers unchanged when importing.",
            ]}
            onImport={importRows}
          />
        </div>
        {loadError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}
      </div>

      {/* Table */}

      <LeadSourceTable
        rows={rows}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
        onPasteGrid={pasteIntoGrid}
        isLocked={isTableLocked}
      />

      {/* Footer */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={isLoading || isSaving || isDeletingSelected || isTableLocked}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void deleteSelectedRows()}
            disabled={
              isLoading ||
              isSaving ||
              isDeletingSelected ||
              isTableLocked ||
              !rows.some((row) => row.selected)
            }
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeletingSelected ? "Deleting..." : "Delete selected"}
          </button>

          <button
            type="button"
            onClick={
              isTableLocked
                ? () => setIsTableLocked(false)
                : () => void handleSave()
            }
            disabled={!isTableLocked && (isSaving || isDeletingSelected || isLoading)}
            className={
              isTableLocked
                ? "rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                : "rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
            }
          >
            {isTableLocked ? "Edit" : isSaving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}