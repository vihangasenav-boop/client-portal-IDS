"use client";

import BulkDataTools from "../components/BulkDataTools";
import { createDraftId, parseImportBoolean } from "../bulk-import-utils";
import SubAccountTypeTable from "./components/SubAccountTypeTable";
import { useSubAccountTypes } from "./hooks/useSubAccountTypes";
import { SubAccountType } from "./type";

export default function SubAccountTypePage() {
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

  const deleteAllRows = async () => {
    const savedCount = rows.filter((row) => row.id > 0).length;
    if (
      savedCount === 0 ||
      !window.confirm(
        `Permanently delete all ${savedCount} sub account types for this property? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "/api/modules/fom/sub-account-type?all=true",
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not delete all sub account types.");
      }

      setRows([{
        id: createDraftId(),
        code: "",
        name: "",
        accountTypeId: 0,
        isDefault: false,
        selected: false,
      }]);
    } catch (error) {
      console.error("Delete all sub account types failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete all sub account types.");
    }
  };

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
            disabled={isLoading || isSaving || accountTypes.length === 0}
            deleteAllDisabled={!rows.some((row) => row.id > 0)}
            onDeleteAll={deleteAllRows}
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
      />

      {/* Footer */}
      <div className="flex flex-wrap justify-between gap-3">

        <button
          type="button"
          onClick={addRow}
          disabled={
            accountTypes.length === 0
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        <button
          type="button"
          onClick={save}
          disabled={
            isSaving ||
            isLoading ||
            propertyIdLoading ||
            !propertyId ||
            accountTypes.length === 0
          }
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving
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
  );
}