"use client";



import { MarketSegment } from "./type";
import { useMarketSegments } from "./hooks/useMarketSegments";
import MarketSegmentTable from "./components/MarketSegmentTable";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../business-accounts/bulk-import-utils";

export default function MarketSegmentPage() {
  const {
    rows,
    setRows,
    groups,
    errors,
    setErrors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useMarketSegments();

  const handleChange = (
    id: number,
    field: keyof MarketSegment,
    value: string | number | boolean
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

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: createDraftId(),
        code: "",
        name: "",
        marketSegmentGroupId: 0,
        displaySequence: 0,
        selected: false,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: MarketSegment[] = [];

    for (const [index, [code, name, groupCode, displaySequence]] of data.entries()) {
      const group = groups.find(
        (option) => option.code.trim().toLowerCase() === (groupCode ?? "").trim().toLowerCase()
      );
      if (!group) {
        return `Row ${index + 1}: Unknown market segment group code "${groupCode ?? ""}".`;
      }

      imported.push({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        marketSegmentGroupId: group.id,
        displaySequence: displaySequence?.trim()
          ? Number(displaySequence)
          : rows.length + index,
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
      !window.confirm(`Permanently delete all ${savedCount} market segments for this property?`)
    ) return;

    try {
      const response = await fetch("/api/modules/fom/market-segment?all=true", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete all market segments.");
      setRows([{
        id: createDraftId(),
        code: "",
        name: "",
        marketSegmentGroupId: 0,
        displaySequence: 0,
        selected: false,
      }]);
      setErrors({});
    } catch (error) {
      console.error("Delete all market segments failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete all market segments.");
    }
  };

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete market segment "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/market-segment?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete market segment.");
      } catch (error) {
        console.error("Delete market segment failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete market segment.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [{
        id: createDraftId(),
        code: "",
        name: "",
        marketSegmentGroupId: 0,
        displaySequence: 0,
        selected: false,
      }];
    });
    setErrors({});
  };

  const selectAll = (checked: boolean) => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        selected: checked,
      }))
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Market Segments</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Define market segments and assign them to their respective groups.</p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Market Segment Group Code", "Display Sequence"]}
            templateName="market-segments"
            disabled={isLoading || isSaving}
            deleteAllDisabled={!rows.some((row) => row.id > 0)}
            onDeleteAll={deleteAllRows}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      <MarketSegmentTable
        rows={rows}
        groups={groups}
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