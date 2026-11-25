"use client";


import ReservationTypeTable from "./components/ReservationTypeTable";

import {
  getNextDisplaySequence,
  ReservationType,
} from "./type";

import {
  useReservationTypes,
} from "./hooks/useReservationTypes";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import {
  createDraftId,
  parseImportBoolean,
} from "../../business-accounts/bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import {
  useDeleteSelectedReservationRows,
  useReservationTableLock,
} from "../hooks/useReservationTableActions";

export default function ReservationTypePage() {
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
  } = useReservationTypes();
  const { isLocked, unlock, saveAndLock } =
    useReservationTableLock(isLoading, rows, save);
  const { isDeleting, deleteSelectedRows } =
    useDeleteSelectedReservationRows(
      "/api/modules/fom/reservation-type",
      "reservation type",
      rows,
      setRows
    );

  // =====================================================
  // CHANGE ROW
  // =====================================================

  const handleChange = (
    id: number,
    field: keyof ReservationType,
    value:
      | string
      | number
      | boolean
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

  // =====================================================
  // ADD ROW
  // =====================================================

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),

        code: "",

        name: "",

        group: "",

        displaySequence: getNextDisplaySequence(previous),

        isDefault: false,

        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: ReservationType[] = [];
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

    for (const [index, [code, name, groupValue, displaySequence, isDefault]] of data.entries()) {
      const group = (groupValue ?? "").trim().toUpperCase();
      const validGroups = [
        "WAITLIST",
        "CONFIRM",
        "TENTATIVE",
      ] as const;
      if (group && !validGroups.some((validGroup) => validGroup === group)) {
        return `Row ${index + 1}: Group must be Waitlist, Confirm, or Tentative.`;
      }

      const normalizedGroup =
        validGroups.find((validGroup) => validGroup === group) ?? "";
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
        group: normalizedGroup,
        displaySequence: sequence,
        isDefault: parseImportBoolean(isDefault),
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
    pasteGridIntoRows<ReservationType>({
      startRow,
      startField,
      clipboardText,
      setRows,
      columns: [
        {
          key: "code",
          headers: ["Code", "Reservation Type Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Reservation Type Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
        {
          key: "group",
          headers: ["Group", "Reservation Type Group"],
          apply: (row, value) => {
            if (!value.trim()) return { ...row, group: "" };

            const normalizedValue = value
              .trim()
              .replace(/[\s_-]/g, "")
              .toLowerCase();
            const groups: ReservationType["group"][] = [
              "WAITLIST",
              "CONFIRM",
              "TENTATIVE",
            ];
            const group = groups.find(
              (option) => option.toLowerCase() === normalizedValue
            );
            return group ? { ...row, group } : row;
          },
        },
        {
          key: "displaySequence",
          headers: ["Display Sequence", "Sequence"],
          apply: (row, value) => ({
            ...row,
            displaySequence: value.trim()
              ? Number(value)
              : row.displaySequence,
          }),
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
      createRow: (existingRows) => ({
        id: createDraftId(),
        code: "",
        name: "",
        group: "",
        displaySequence: getNextDisplaySequence(existingRows),
        isDefault: false,
        selected: false,
      }),
    });

  // =====================================================
  // REMOVE ROW
  // =====================================================

  const removeRow = async (
    id: number
  ) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete reservation type "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/reservation-type?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete reservation type.");
      } catch (error) {
        console.error("Delete reservation type failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete reservation type.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [{
        id: createDraftId(),
        code: "",
        name: "",
        group: "",
        displaySequence: getNextDisplaySequence(remaining),
        isDefault: false,
        selected: false,
      }];
    });
    setErrors({});
  };

  // =====================================================
  // SELECT ALL
  // =====================================================

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

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="space-y-6 p-6">
      {/* =========================================
          HEADER
      ========================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Reservation Types</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Configure reservation types used by the Front Office module.</p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Group", "Display Sequence", "Is Default"]}
            templateName="reservation-types"
            disabled={isLoading || isSaving || isDeleting}
            importDisabled={isLocked}
            instructions={[
              "Code is required, unique, and cannot exceed 8 characters.",
              "Name is required, unique, and must be at least 2 characters.",
              "Group must be Waitlist, Confirm, or Tentative.",
              "Keep the template column headers unchanged.",
            ]}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      {/* =========================================
          TABLE
      ========================================= */}

      <ReservationTypeTable
        rows={rows}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
        onPasteGrid={pasteIntoGrid}
        isLocked={isLocked}
      />

      {/* =========================================
          FOOTER
      ========================================= */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* ADD ROW */}

        <button
          type="button"
          onClick={addRow}
          disabled={
            isLoading ||
            propertyIdLoading ||
            isSaving ||
            isDeleting ||
            isLocked
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        {/* SAVE */}

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
              : "rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"}
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