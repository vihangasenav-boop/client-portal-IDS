"use client";




import {
  MarketSegmentGroup,
} from "./type";

import {
  useMarketSegmentGroups,
} from "./hooks/useMarketSegmentGroups";
import MarketSegmentGroupTable from "./component/MarketSegmentGroupTable";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../business-accounts/bulk-import-utils";

export default function MarketSegmentGroupPage() {
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
  } =
    useMarketSegmentGroups();

  // -----------------------------------------
  // Change row
  // -----------------------------------------

  const handleChange = (
    id: number,
    field: keyof MarketSegmentGroup,
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
        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported = data.map(([code, name]) => ({
      id: createDraftId(),
      code: code ?? "",
      name: name ?? "",
      selected: false,
    }));

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
      !window.confirm(`Permanently delete all ${savedCount} market segment groups and their segments for this property?`)
    ) return;

    try {
      const response = await fetch("/api/modules/fom/market-segment-group?all=true", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete all market segment groups.");
      setRows([{
        id: createDraftId(),
        code: "",
        name: "",
        selected: false,
      }]);
      setErrors({});
    } catch (error) {
      console.error("Delete all market segment groups failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete all market segment groups.");
    }
  };

  // -----------------------------------------
  // Remove row
  // -----------------------------------------

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete market segment group "${row.name || row.code}" and its segments?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/market-segment-group?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete market segment group.");
      } catch (error) {
        console.error("Delete market segment group failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete market segment group.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [{
        id: createDraftId(),
        code: "",
        name: "",
        selected: false,
      }];
    });
    setErrors({});
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

  return (
    <div className="space-y-6 p-6">

      {/* Header */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Market Segment Groups</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Define the market segment groups used by the Front Office module.</p>
          </div>
          <BulkDataTools
            columns={["Code", "Name"]}
            templateName="market-segment-groups"
            disabled={isLoading || isSaving}
            deleteAllDisabled={!rows.some((row) => row.id > 0)}
            onDeleteAll={deleteAllRows}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      {/* Table */}

      <MarketSegmentGroupTable
        rows={rows}
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
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
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