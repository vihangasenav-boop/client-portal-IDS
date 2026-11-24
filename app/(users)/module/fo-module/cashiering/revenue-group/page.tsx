"use client";

import RevenueGroupTable from "./components/RevenueGroupTable";
import { useRevenueGroups } from "./hooks/useRevenueGroups";
import { RevenueGroupRow } from "./type";

export default function RevenueGroupPage() {
  const {
    rows,
    setRows,
    revenues,
    errors,
    isLoading,
    isSaving,
    loadError,
    load,
    save,
    addRow,
    removeRow,
  } = useRevenueGroups();

  const handleChange = (
    id: number,
    field: keyof RevenueGroupRow,
    value: string | number | number[] | boolean
  ) => {
    setRows((current) =>
      current.map((row) => row.id === id ? { ...row, [field]: value } : row)
    );
  };

  return (
    <div className="space-y-6 p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
          Cashiering
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Revenue Groups</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Organize revenue codes into groups and assign one or more revenues to each group.
        </p>
        {loadError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{loadError}</span>
            <button type="button" onClick={() => void load()} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}
      </header>

      <RevenueGroupTable
        rows={rows}
        revenues={revenues}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
      />

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={isLoading || isSaving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          + Add Row
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving || isLoading}
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Data"}
        </button>
      </div>
    </div>
  );
}
