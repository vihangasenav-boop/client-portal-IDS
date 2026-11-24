"use client";

import { Trash2 } from "lucide-react";
import {
  RevenueGroupClassification,
  RevenueGroupErrors,
  RevenueGroupRow,
  RevenueOption,
  revenueGroupClassifications,
  sacHsnTypes,
} from "../type";

type Props = {
  rows: RevenueGroupRow[];
  revenues: RevenueOption[];
  errors: Record<number, RevenueGroupErrors>;
  isLoading: boolean;
  onChange: (
    id: number,
    field: keyof RevenueGroupRow,
    value: string | number | number[] | boolean
  ) => void;
  onRemove: (id: number) => void;
};

const inputClass =
  "min-h-11 w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400";

export default function RevenueGroupTable({
  rows,
  revenues,
  errors,
  isLoading,
  onChange,
  onRemove,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1450px] border-separate border-spacing-0 text-sm text-black">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-12 border-b border-slate-200 px-3 py-3">#</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Code *</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Name *</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Group Classification</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Revenues *</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">SAC / HSN</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">SAC / HSN Number</th>
            <th className="w-24 border-b border-slate-200 px-3 py-3">Default</th>
            <th className="w-24 border-b border-slate-200 px-3 py-3">Active</th>
            <th className="w-20 border-b border-slate-200 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={10} className="p-8 text-center text-slate-500">
                Loading revenue groups...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-8 text-center text-slate-500">
                No revenue groups added yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors[row.id];
              return (
                <tr key={row.id}>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Revenue group code"
                      value={row.code}
                      onChange={(event) => onChange(row.id, "code", event.target.value)}
                      className={`${inputClass} ${rowErrors?.code ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Revenue group name"
                      value={row.name}
                      onChange={(event) => onChange(row.id, "name", event.target.value)}
                      className={`${inputClass} ${rowErrors?.name ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <select
                      aria-label="Revenue group classification"
                      value={row.revenueGroupClassification}
                      onChange={(event) =>
                        onChange(
                          row.id,
                          "revenueGroupClassification",
                          event.target.value as RevenueGroupClassification
                        )
                      }
                      className={inputClass}
                    >
                      {revenueGroupClassifications.map((classification) => (
                        <option key={classification.value} value={classification.value}>
                          {classification.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-slate-100 p-2">
                    {revenues.length > 0 ? (
                      <>
                        <select
                          aria-label="Revenues in this group"
                          multiple
                          value={row.revenueIds.map(String)}
                          onChange={(event) => {
                            const ids = Array.from(event.target.selectedOptions).map((option) =>
                              Number(option.value)
                            );
                            onChange(row.id, "revenueIds", ids);
                          }}
                          className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-black outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          {revenues.map((revenue) => (
                            <option key={revenue.id} value={revenue.id}>
                              {revenue.code} - {revenue.name}
                              {!revenue.isActive ? " (inactive)" : ""}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          Use Ctrl/Cmd-click to select multiple.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Add a revenue first.
                      </p>
                    )}
                    {rowErrors?.revenueIds && (
                      <p className="mt-1 text-xs text-red-600">{rowErrors.revenueIds}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <select
                      aria-label="SAC or HSN type"
                      value={row.sacHsn}
                      onChange={(event) => onChange(row.id, "sacHsn", event.target.value)}
                      className={inputClass}
                    >
                      {sacHsnTypes.map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label={`${row.sacHsn} number`}
                      placeholder={`Enter ${row.sacHsn} number`}
                      value={row.sacHsnNumber}
                      onChange={(event) => onChange(row.id, "sacHsnNumber", event.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <input
                      aria-label="Default revenue group"
                      type="checkbox"
                      checked={row.isDefault}
                      onChange={(event) => onChange(row.id, "isDefault", event.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <input
                      aria-label="Active revenue group"
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => onChange(row.id, "isActive", event.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      aria-label={`Delete ${row.name || "revenue group"} row`}
                      className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
