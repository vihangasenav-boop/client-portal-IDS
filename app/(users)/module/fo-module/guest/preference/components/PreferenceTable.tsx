"use client";

import { Trash2 } from "lucide-react";
import { Preference, PreferenceGroupOption, RowErrors } from "../type";

type Props = {
  rows: Preference[];
  preferenceGroups: PreferenceGroupOption[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;
  onChange: (
    id: number,
    field: keyof Preference,
    value: string | number | boolean
  ) => void;
  onRemove: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
};

export default function PreferenceTable({
  rows,
  preferenceGroups,
  errors,
  isLoading,
  onChange,
  onRemove,
  onSelectAll,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-separate border-spacing-0 text-sm text-black">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-10 border-b border-slate-200 px-3 py-3">
              <input
                type="checkbox"
                aria-label="Select all preferences"
                onChange={(event) => onSelectAll(event.target.checked)}
                className="h-4 w-4"
              />
            </th>
            <th className="w-12 border-b border-slate-200 px-3 py-3">#</th>
            <th className="min-w-52 border-b border-slate-200 px-3 py-3 text-left">
              Preference Group <span className="text-red-500">*</span>
            </th>
            <th className="min-w-36 border-b border-slate-200 px-3 py-3 text-left">
              Code <span className="text-red-500">*</span>
            </th>
            <th className="min-w-48 border-b border-slate-200 px-3 py-3 text-left">
              Name <span className="text-red-500">*</span>
            </th>
            <th className="w-36 border-b border-slate-200 px-3 py-3 text-left">
              Display Sequence
            </th>
            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">
              Is Default
            </th>
            <th className="w-20 border-b border-slate-200 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-500">
                Loading preferences...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-500">
                No preferences yet. Add a row to get started.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors[row.id];

              return (
                <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                  <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      aria-label={`Select preference ${row.name || row.code || index + 1}`}
                      onChange={(event) => onChange(row.id, "selected", event.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${rowErrors?.preferenceGroupId ? "bg-red-50" : ""}`}>
                    <select
                      value={row.preferenceGroupId || ""}
                      aria-label={`Preference ${index + 1} group`}
                      aria-invalid={Boolean(rowErrors?.preferenceGroupId)}
                      title={rowErrors?.preferenceGroupId || ""}
                      onChange={(event) =>
                        onChange(row.id, "preferenceGroupId", Number(event.target.value))
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      <option value="">Select a group</option>
                      {preferenceGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.code} - {group.name}
                        </option>
                      ))}
                    </select>
                    {rowErrors?.preferenceGroupId && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.preferenceGroupId}</p>
                    )}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${rowErrors?.code ? "bg-red-50" : ""}`}>
                    <input
                      type="text"
                      value={row.code}
                      aria-label={`Preference ${index + 1} code`}
                      aria-invalid={Boolean(rowErrors?.code)}
                      title={rowErrors?.code || ""}
                      onChange={(event) => onChange(row.id, "code", event.target.value)}
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${rowErrors?.name ? "bg-red-50" : ""}`}>
                    <input
                      type="text"
                      value={row.name}
                      aria-label={`Preference ${index + 1} name`}
                      aria-invalid={Boolean(rowErrors?.name)}
                      title={rowErrors?.name || ""}
                      onChange={(event) => onChange(row.id, "name", event.target.value)}
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${rowErrors?.displaySequence ? "bg-red-50" : ""}`}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.displaySequence}
                      aria-label={`Preference ${index + 1} display sequence`}
                      aria-invalid={Boolean(rowErrors?.displaySequence)}
                      title={rowErrors?.displaySequence || ""}
                      onChange={(event) =>
                        onChange(row.id, "displaySequence", Number(event.target.value))
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.displaySequence && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.displaySequence}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <select
                      value={row.isDefault ? "Yes" : "No"}
                      aria-label={`Preference ${index + 1} default setting`}
                      onChange={(event) =>
                        onChange(row.id, "isDefault", event.target.value === "Yes")
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {rowErrors?.isDefault && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.isDefault}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      aria-label={`Delete ${row.name || "preference"} row`}
                      title="Delete row"
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
