"use client";

import { Trash2 } from "lucide-react";
import { PreferenceGroup, RowErrors } from "../type";

type Props = {
  rows: PreferenceGroup[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;
  onChange: (
    id: number,
    field: keyof PreferenceGroup,
    value: string | boolean
  ) => void;
  onRemove: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
};

export default function PreferenceGroupTable({
  rows,
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
                aria-label="Select all preference groups"
                onChange={(event) => onSelectAll(event.target.checked)}
                className="h-4 w-4"
              />
            </th>
            <th className="w-12 border-b border-slate-200 px-3 py-3">#</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Code <span className="text-red-500">*</span>
            </th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Name <span className="text-red-500">*</span>
            </th>
            <th className="w-20 border-b border-slate-200 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-500">
                Loading preference groups...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-slate-500">
                No preference groups yet. Add a row to get started.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const codeError = errors[row.id]?.code;
              const nameError = errors[row.id]?.name;

              return (
                <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                  <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      aria-label={`Select preference group ${row.name || row.code || index + 1}`}
                      onChange={(event) =>
                        onChange(row.id, "selected", event.target.checked)
                      }
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${codeError ? "bg-red-50" : ""}`}>
                    <input
                      type="text"
                      value={row.code}
                      aria-label={`Preference group ${index + 1} code`}
                      aria-invalid={Boolean(codeError)}
                      title={codeError || ""}
                      onChange={(event) => onChange(row.id, "code", event.target.value)}
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {codeError && <p className="px-3 pb-2 text-xs text-red-600">{codeError}</p>}
                  </td>
                  <td className={`border-b border-slate-100 p-0 ${nameError ? "bg-red-50" : ""}`}>
                    <input
                      type="text"
                      value={row.name}
                      aria-label={`Preference group ${index + 1} name`}
                      aria-invalid={Boolean(nameError)}
                      title={nameError || ""}
                      onChange={(event) => onChange(row.id, "name", event.target.value)}
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {nameError && <p className="px-3 pb-2 text-xs text-red-600">{nameError}</p>}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      aria-label={`Delete ${row.name || "preference group"} row`}
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
