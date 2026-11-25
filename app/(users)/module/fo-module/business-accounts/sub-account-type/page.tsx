"use client";

import { useEffect, useRef, useState } from "react";
import BulkDataTools from "../components/BulkDataTools";
import { createDraftId, parseImportBoolean } from "../bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import SubAccountTypeTable from "./components/SubAccountTypeTable";
import { useSubAccountTypes } from "./hooks/useSubAccountTypes";
import { SubAccountType } from "./type";

export default function SubAccountTypePage() {
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const initialLoadHandled = useRef(false);
  const {
    rows,
    setRows,
    accountTypes,
    errors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useSubAccountTypes();

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

  // ==========================================
  // Change row
  // ==========================================

  const handleChange = (
    id: number,
    field: keyof SubAccountType,
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

  // ==========================================
  // Add row
  // ==========================================

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),
        code: "",
        name: "",
        accountTypeId: 0,
        isDefault: false,
        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported = data.map(([code, name, accountTypeCode, isDefault]) => {
      const selectedAccountType = accountTypes.find(
        (accountType) =>
          accountType.code.trim().toLowerCase() ===
          (accountTypeCode ?? "").trim().toLowerCase()
      );

      return {
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        accountTypeId: selectedAccountType?.id ?? 0,
        isDefault: parseImportBoolean(isDefault),
        selected: false,
      };
    });

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
          headers: ["Code", "Sub Account Type Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Sub Account Type Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
        {
          key: "accountTypeId",
          headers: [
            "Account Type",
            "Account Type Code",
            "Account Type Name",
          ],
          apply: (row, value) => {
            const normalizedValue = value.trim().toLowerCase();
            const accountType = accountTypes.find(
              (option) =>
                option.code.trim().toLowerCase() === normalizedValue ||
                option.name.trim().toLowerCase() === normalizedValue
            );
            return {
              ...row,
              accountTypeId: accountType?.id ?? 0,
            };
          },
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
        accountTypeId: 0,
        isDefault: false,
        selected: false,
      }),
    });

  // ==========================================
  // Remove row
  // ==========================================

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete sub account type "${row.name || row.code}"?`)) return;

      try {
        const response = await fetch(
          `/api/modules/fom/sub-account-type?id=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not delete sub account type.");
        }
      } catch (error) {
        console.error("Delete sub account type failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete sub account type.");
        return;
      }
    }

    setRows((previous) =>
      previous.filter(
        (row) =>
          row.id !== id
      )
    );
  };

  // ==========================================
  // Select all
  // ==========================================

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

    if (!window.confirm(`Delete ${selectedRows.length} selected sub account type row(s)?`)) {
      return;
    }

    const savedIds = selectedRows.flatMap((row) => row.id > 0 ? [row.id] : []);
    const selectedIds = new Set(selectedRows.map((row) => row.id));
    setIsDeletingSelected(true);

    try {
      if (savedIds.length > 0) {
        const response = await fetch("/api/modules/fom/sub-account-type", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: savedIds }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not delete selected sub account types.");
        }
      }

      setRows((previous) => previous.filter((row) => !selectedIds.has(row.id)));
    } catch (error) {
      console.error("Delete selected sub account types failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete selected sub account types.");
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
              Sub Account Types
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Add detailed classifications and associate each with an account type.
            </p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Account Type Code", "Is Default"]}
            templateName="sub-account-types"
            disabled={isLoading || isSaving || isDeletingSelected}
            importDisabled={isTableLocked || accountTypes.length === 0}
            instructions={[
              "Code is required, must be unique for its account type, and cannot exceed 8 characters.",
              "Name is required and must be at least 2 characters.",
              "Use an existing Account Type Code and Yes or No for Is Default.",
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

      {/* No Account Types */}
      {!isLoading &&
        accountTypes.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No account types are available. Create account types before importing or adding sub account types.
          </div>
        )}

      {/* Table */}
      <SubAccountTypeTable
        rows={rows}
        accountTypes={accountTypes}
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
          disabled={
            accountTypes.length === 0 ||
            isTableLocked ||
            isLoading ||
            isSaving ||
            isDeletingSelected
          }
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
            disabled={
              isTableLocked
                ? false
                : isSaving ||
                  isDeletingSelected ||
                  isLoading ||
                  propertyIdLoading ||
                  !propertyId ||
                  accountTypes.length === 0
            }
            className={
              isTableLocked
                ? "rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                : "rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
            }
          >
            {isTableLocked
              ? "Edit"
              : isSaving
                ? "Saving..."
                : propertyIdLoading
                  ? "Resolving property..."
                  : !propertyId
                    ? "No property selected"
                    : accountTypes.length === 0
                      ? "Create Account Type First"
                      : "Save Data"}
          </button>
        </div>

      </div>
    </div>
  );
}