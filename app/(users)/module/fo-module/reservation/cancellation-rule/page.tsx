"use client";

import CancellationRuleTable from "./components/CancellationRuleTable";
import {
  CancellationRule,
  CANCELLATION_RULE_TYPES,
  emptyRow,
  getNextDisplaySequence,
} from "./type";
import { useCancellationRules } from "./hooks/useCancellationRules";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../business-accounts/bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import {
  useDeleteSelectedReservationRows,
  useReservationTableLock,
} from "../hooks/useReservationTableActions";

export default function CancellationRulePage() {
  const {
    rows,
    setRows,
    errors,
    setErrors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useCancellationRules();
  const { isLocked, unlock, saveAndLock } =
    useReservationTableLock(isLoading, rows, save);
  const { isDeleting, deleteSelectedRows } =
    useDeleteSelectedReservationRows(
      "/api/modules/fom/cancellation-rule",
      "cancellation rule",
      rows,
      setRows
    );

  // =========================================
  // Change row
  // =========================================

  const handleChange = (
    id: number,
    field: keyof CancellationRule,
    value:
      | string
      | number
      | boolean
      | null
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

  // =========================================
  // Add row
  // =========================================

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      emptyRow(createDraftId(), getNextDisplaySequence(previous)),
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: CancellationRule[] = [];
    const usedSequences = new Set(
      rows
        .filter((row) => row.code.trim() || row.name.trim())
        .map((row) => row.displaySequence)
        .filter((sequence) => Number.isInteger(sequence) && sequence > 0)
    );
    const nextSequence = () => {
      let sequence = 1;
      while (usedSequences.has(sequence)) sequence++;
      usedSequences.add(sequence);
      return sequence;
    };

    for (const [index, [code, name, typeValue, amount, daysBeforeArrival, displaySequence, cancelBeforeTime]] of data.entries()) {
      const type = CANCELLATION_RULE_TYPES.find(
        (option) => option.toLowerCase() === (typeValue ?? "").trim().toLowerCase()
      );
      if (typeValue?.trim() && !type) {
        return `Row ${index + 1}: Select a valid cancellation rule type.`;
      }

      const sequence = displaySequence?.trim()
        ? Number(displaySequence)
        : nextSequence();
      if (Number.isInteger(sequence) && sequence > 0) {
        usedSequences.add(sequence);
      }

      imported.push({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        type: type ?? "",
        amount: amount?.trim() ? Number(amount) : null,
        daysBeforeArrival: daysBeforeArrival?.trim()
          ? Number(daysBeforeArrival)
          : null,
        displaySequence: sequence,
        cancelBeforeTime: cancelBeforeTime ?? "",
        selected: false,
      });
    }

    setRows((previous) => [
      ...previous.filter((row) => row.code.trim() || row.name.trim()),
      ...imported,
    ]);
    setErrors({});
  };

  const pasteIntoGrid = (
    startRow: number,
    startField: string,
    clipboardText: string
  ) =>
    pasteGridIntoRows<CancellationRule>({
      startRow,
      startField,
      clipboardText,
      setRows,
      columns: [
        {
          key: "code",
          headers: ["Code", "Cancellation Rule Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Cancellation Rule Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
        {
          key: "type",
          headers: ["Type", "Cancellation Rule Type"],
          apply: (row, value) => {
            const type = CANCELLATION_RULE_TYPES.find(
              (option) =>
                option.toLowerCase() === value.trim().toLowerCase()
            );
            return { ...row, type: type ?? "" };
          },
        },
        {
          key: "amount",
          headers: ["Amount"],
          apply: (row, value) => ({
            ...row,
            amount: value.trim() ? Number(value) : null,
          }),
        },
        {
          key: "daysBeforeArrival",
          headers: ["Days Before Arrival"],
          apply: (row, value) => ({
            ...row,
            daysBeforeArrival: value.trim() ? Number(value) : null,
          }),
        },
        {
          key: "displaySequence",
          headers: ["Display Sequence", "Sequence"],
          apply: (row, value) => ({
            ...row,
            displaySequence: Number(value),
          }),
        },
        {
          key: "cancelBeforeTime",
          headers: ["Cancel Before Time"],
          apply: (row, value) => ({
            ...row,
            cancelBeforeTime: value,
          }),
        },
      ],
      createRow: (existingRows) =>
        emptyRow(createDraftId(), getNextDisplaySequence(existingRows)),
    });

  // =========================================
  // Remove row
  // =========================================

  const removeRow = async (
    id: number
  ) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete cancellation rule "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/cancellation-rule?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete cancellation rule.");
      } catch (error) {
        console.error("Delete cancellation rule failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete cancellation rule.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0
        ? remaining
        : [emptyRow(createDraftId())];
    });
    setErrors({});
  };

  // =========================================
  // Select all
  // =========================================

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Cancellation Rules</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage cancellation rules for this property&apos;s FOM module.</p>
          </div>
          <BulkDataTools
            columns={[
              "Code",
              "Name",
              "Type",
              "Amount",
              "Days Before Arrival",
              "Display Sequence",
              "Cancel Before Time",
            ]}
            templateName="cancellation-rules"
            disabled={isLoading || isSaving || isDeleting}
            importDisabled={isLocked}
            instructions={[
              "Code is required, unique, and cannot exceed 8 characters.",
              "Name is required, unique, and must be at least 2 characters.",
              "Choose a Type and enter an Amount from 0 to 100 percent.",
              "Days Before Arrival and Cancel Before Time are required.",
              "Display Sequence must be a positive unique integer.",
              "Keep the template column headers unchanged.",
            ]}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      {/* Table */}
      <CancellationRuleTable
        rows={rows}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
        onPasteGrid={pasteIntoGrid}
        isLocked={isLocked}
      />

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={isLocked || isLoading || isSaving || isDeleting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void deleteSelectedRows()}
            disabled={isLocked || isLoading || isSaving || isDeleting || !rows.some((row) => row.selected)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={isLocked ? unlock : () => void saveAndLock()}
            disabled={!isLocked && (isSaving || isLoading || propertyIdLoading || !propertyId || isDeleting)}
            className={isLocked
              ? "rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              : "rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"}
          >
            {isLocked
              ? "Edit"
              : isSaving
                ? "Saving..."
                : propertyIdLoading
                  ? "Resolving property..."
                  : !propertyId
                    ? "No property selected"
                    : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}