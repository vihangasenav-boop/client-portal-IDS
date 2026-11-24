"use client";

import { Trash2 } from "lucide-react";
import {
  RoomAmenity,
  RowErrors,
} from "../type";

type Props = {
  rows: RoomAmenity[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;

  onChange: (
    id: number,
    field: keyof RoomAmenity,
    value: string | boolean
  ) => void;

  onRemove: (id: number) => void;

  onSelectAll: (checked: boolean) => void;
};

export default function RoomAmenityTable({
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
                onChange={(e) =>
                  onSelectAll(e.target.checked)
                }
                className="h-4 w-4"
              />
            </th>

            <th className="w-12 border-b border-slate-200 px-3 py-3">
              #
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Amenity Code{" "}
              <span className="text-red-500">*</span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Amenity Name{" "}
              <span className="text-red-500">*</span>
            </th>

            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">
              Is Default
            </th>

            <th className="w-20 border-b border-slate-200 px-3 py-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={6}
                className="p-8 text-center text-slate-500"
              >
                Loading room amenities...
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const codeError =
                errors[row.id]?.code;

              const nameError =
                errors[row.id]?.name;

              return (
                <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                  <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "selected",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>

                  <td
                    className={`border-b border-slate-100 p-0 ${
                      codeError
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.code}
                      title={codeError || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "code",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {codeError && <p className="px-3 pb-2 text-xs text-red-600">{codeError}</p>}
                  </td>

                  <td
                    className={`border-b border-slate-100 p-0 ${
                      nameError
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.name}
                      title={nameError || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "name",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {nameError && <p className="px-3 pb-2 text-xs text-red-600">{nameError}</p>}
                  </td>

                  <td className="border-b border-slate-100 p-0">
                    <select
                      value={
                        row.isDefault
                          ? "Yes"
                          : "No"
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "isDefault",
                          e.target.value === "Yes"
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none"
                    >
                      <option value="No">
                        No
                      </option>

                      <option value="Yes">
                        Yes
                      </option>
                    </select>
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        onRemove(row.id)
                      }
                      aria-label={`Delete ${row.name || "room amenity"} row`}
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