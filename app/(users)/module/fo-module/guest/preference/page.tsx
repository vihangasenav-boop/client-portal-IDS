"use client";

import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId, parseImportBoolean } from "../../business-accounts/bulk-import-utils";
import PreferenceTable from "./components/PreferenceTable";
import { usePreferences } from "./hooks/usePreferences";
import { Preference } from "./type";

export default function PreferencePage() {
  const {
    rows,
    setRows,
    preferenceGroups,
    errors,
    setErrors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = usePreferences();

  const handleChange = (
    id: number,
    field: keyof Preference,
    value: string | number | boolean
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),
        preferenceGroupId: 0,
        code: "",
        name: "",
        displaySequence: 0,
        isDefault: false,
        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: Preference[] = [];

    for (const [index, [code, name, groupCode, displaySequence, isDefault]] of data.entries()) {
      const group = preferenceGroups.find(
        (option) =>
          option.code.trim().toLowerCase() ===
          (groupCode ?? "").trim().toLowerCase()
      );
      if (!group) {
        return `Row ${index + 1}: Unknown preference group code "${groupCode ?? ""}".`;
      }

      imported.push({
        id: createDraftId(),
        preferenceGroupId: group.id,
        code: code ?? "",
        name: name ?? "",
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
  };

  const deleteAllRows = async () => {
    const savedCount = rows.filter((row) => row.id > 0).length;
    if (
      savedCount === 0 ||
      !window.confirm(
        `Permanently delete all ${savedCount} preferences for this property? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/modules/fom/preference?all=true", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete preferences.");
      }

      setRows([{
        id: createDraftId(),
        preferenceGroupId: 0,
        code: "",
        name: "",
        displaySequence: 0,
        isDefault: false,
        selected: false,
      }]);
      setErrors({});
    } catch (error) {
      console.error("Delete all preferences failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete preferences.");
    }
  };

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete preference "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(
          `/api/modules/fom/preference?id=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not delete preference.");
        }
      } catch (error) {
        console.error("Delete preference failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete preference.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length
        ? remaining
        : [{
            id: createDraftId(),
            preferenceGroupId: 0,
            code: "",
            name: "",
            displaySequence: 0,
            isDefault: false,
            selected: false,
          }];
    });
    setErrors({});
  };

  const selectAll = (checked: boolean) => {
    setRows((previous) => previous.map((row) => ({ ...row, selected: checked })));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Guest setup
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Preferences
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Maintain guest preferences within their property-specific groups.
            </p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Preference Group Code", "Display Sequence", "Is Default"]}
            templateName="preferences"
            disabled={isLoading || isSaving || preferenceGroups.length === 0}
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

      {!isLoading && preferenceGroups.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Create a preference group before adding preferences.
        </div>
      )}

      <PreferenceTable
        rows={rows}
        preferenceGroups={preferenceGroups}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
      />

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={isLoading || preferenceGroups.length === 0}
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
            preferenceGroups.length === 0
          }
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : propertyIdLoading
              ? "Resolving property..."
              : !propertyId
                ? "No property selected"
                : preferenceGroups.length === 0
                  ? "Create Preference Group First"
                  : "Save Data"}
        </button>
      </div>
    </div>
  );
}
