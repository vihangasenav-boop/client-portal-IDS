"use client";


import ReservationTypeTable from "./components/ReservationTypeTable";

import {
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
    const nextSequence =
      rows.length > 0
        ? Math.max(
            ...rows.map(
              (row) =>
                row.displaySequence
            )
          ) + 1
        : 1;

    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),

        code: "",

        name: "",

        group: "CONFIRM",

        displaySequence:
          nextSequence,

        isDefault: false,

        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: ReservationType[] = [];

    for (const [index, [code, name, groupValue, displaySequence, isDefault]] of data.entries()) {
      const group = (groupValue ?? "").trim().toUpperCase();
      const validGroups = ["WAITLIST", "CONFIRM", "TENTATIVE"];
      if (group && !validGroups.includes(group)) {
        return `Row ${index + 1}: Group must be Waitlist, Confirm, or Tentative.`;
      }

      imported.push({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        group: (group || "CONFIRM") as ReservationType["group"],
        displaySequence: displaySequence?.trim()
          ? Number(displaySequence)
          : rows.length + index,
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

  const deleteAllRows = async () => {
    const savedCount = rows.filter((row) => row.id > 0).length;
    if (
      savedCount === 0 ||
      !window.confirm(`Permanently delete all ${savedCount} reservation types for this property?`)
    ) return;

    try {
      const response = await fetch("/api/modules/fom/reservation-type?all=true", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete all reservation types.");
      setRows([{
        id: createDraftId(),
        code: "",
        name: "",
        group: "CONFIRM",
        displaySequence: 0,
        isDefault: false,
        selected: false,
      }]);
      setErrors({});
    } catch (error) {
      console.error("Delete all reservation types failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete all reservation types.");
    }
  };

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
        group: "CONFIRM",
        displaySequence: 0,
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
            disabled={isLoading || isSaving}
            deleteAllDisabled={!rows.some((row) => row.id > 0)}
            onDeleteAll={deleteAllRows}
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
      />

      {/* =========================================
          FOOTER
      ========================================= */}

      <div className="flex flex-wrap justify-between gap-3">
        {/* ADD ROW */}

        <button
          type="button"
          onClick={addRow}
          disabled={
            isLoading ||
            propertyIdLoading
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        {/* SAVE */}

        <button
          type="button"
          onClick={save}
          disabled={
            isSaving ||
            isLoading ||
            propertyIdLoading ||
            !propertyId
          }
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : propertyIdLoading
              ? "Resolving property..."
              : !propertyId
                ? "No property selected"
                : "Save Data"}
        </button>
      </div>
    </div>
  );
}