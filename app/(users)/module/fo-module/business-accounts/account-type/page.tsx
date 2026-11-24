"use client";

import { useState } from "react";
import BulkDataTools from "../components/BulkDataTools";
import { createDraftId, parseImportBoolean } from "../bulk-import-utils";
import AccountTypeTable from "./components/AccountTypeTable";
import { useAccountTypes } from "./hooks/useAccountTypes";
import { AccountType } from "./type";


export default function AccountTypePage() {
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const {
    rows,
    setRows,
    errors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useAccountTypes();

  // -----------------------------------------
  // Change row
  // -----------------------------------------

  const handleChange = (
    id: number,
    field: keyof AccountType,
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
    startField: "code" | "name" | "isDefault",
    clipboardText: string
  ) => {
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
    const header = matrix[0].map(normalizeHeader);
    const codeIndex = header.findIndex((value) =>
      ["code", "accounttypecode"].includes(value)
    );
    const nameIndex = header.findIndex((value) =>
      ["name", "accounttypename"].includes(value)
    );
    const defaultIndex = header.findIndex((value) =>
      ["isdefault", "default"].includes(value)
    );
    const hasHeader = [codeIndex, nameIndex, defaultIndex].filter(
      (index) => index >= 0
    ).length >= 2;

    let fields: Array<"code" | "name" | "isDefault">;
    if (hasHeader) {
      const sourceIndexes = [codeIndex, nameIndex, defaultIndex];
      fields = ["code", "name", "isDefault"];
      matrix = matrix.slice(1).map((row) =>
        sourceIndexes.map((index) => (index >= 0 ? row[index] ?? "" : ""))
      );
    } else {
      while (matrix.length > 0 && matrix.every((row) => !row[0])) {
        matrix = matrix.map((row) => row.slice(1));
      }

      if (
        (matrix[0]?.length ?? 0) > 3 &&
        matrix.every((row, index) => row[0] === String(index + 1))
      ) {
        matrix = matrix.map((row) => row.slice(1));
      }

      const fieldOrder = ["code", "name", "isDefault"] as const;
      fields = fieldOrder.slice(fieldOrder.indexOf(startField));
    }

    if (matrix.length === 0) return true;

    const fieldOffset = hasHeader
      ? 0
      : (["code", "name", "isDefault"] as const).indexOf(startField);
    setRows((previous) => {
      const next = [...previous];
      matrix.forEach((cells, rowOffset) => {
        const targetIndex = startRow + rowOffset;
        const existing = next[targetIndex] ?? {
          id: createDraftId(),
          code: "",
          name: "",
          isDefault: false,
          selected: false,
        };
        const updated = { ...existing };

        const pastedFieldCount = hasHeader
          ? fields.length
          : Math.min(fields.length, Math.max(0, cells.length - fieldOffset));
        fields.slice(0, pastedFieldCount).forEach((field, cellIndex) => {
          const targetField = hasHeader
            ? field
            : fields[cellIndex];
          const sourceIndex = hasHeader
            ? cellIndex
            : fieldOffset + cellIndex;
          const value = cells[sourceIndex] ?? "";
          if (targetField === "isDefault") {
            updated.isDefault = parseImportBoolean(value);
          } else {
            updated[targetField] = value;
          }
        });

        next[targetIndex] = updated;
      });
      return next;
    });

    return true;
  };

  // -----------------------------------------
  // Remove row
  // -----------------------------------------

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete account type "${row.name || row.code}"?`)) return;

      try {
        const response = await fetch(
          `/api/modules/fom/account-type?id=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not delete account type.");
        }
      } catch (error) {
        console.error("Delete account type failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete account type.");
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

  const selectAll = (checked: boolean) => {
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

    if (
      !window.confirm(
        `Delete ${selectedRows.length} selected account type row(s)?`
      )
    ) {
      return;
    }

    const savedIds = selectedRows.flatMap((row) =>
      row.id > 0 ? [row.id] : []
    );
    const selectedIds = new Set(selectedRows.map((row) => row.id));
    setIsDeletingSelected(true);
    try {
      if (savedIds.length > 0) {
        const response = await fetch("/api/modules/fom/account-type", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: savedIds }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data?.error || "Could not delete selected account types."
          );
        }
      }

      setRows((previous) =>
        previous.filter((row) => !selectedIds.has(row.id))
      );
    } catch (error) {
      console.error("Delete selected account types failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not delete selected account types."
      );
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
              Account Types
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage the primary classifications used for sales and revenue transactions.
            </p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Is Default"]}
            templateName="account-types"
            disabled={isLoading || isSaving || isDeletingSelected}
            deleteSelectedDisabled={!rows.some((row) => row.selected)}
            onDeleteSelected={() => void deleteSelectedRows()}
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
      <AccountTypeTable
        rows={rows}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
        onPasteGrid={pasteIntoGrid}
      />

      {/* Footer */}
      <div className="flex flex-wrap justify-between gap-3">

        <button
          type="button"
          onClick={addRow}
          disabled={isLoading || isSaving || isDeletingSelected}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        <button
          type="button"
          onClick={save}
          disabled={
            isSaving ||
            isDeletingSelected ||
            isLoading ||
            propertyIdLoading ||
            !propertyId
          }
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
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