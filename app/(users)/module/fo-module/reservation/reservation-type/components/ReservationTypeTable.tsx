"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import {
  ReservationType,
  RowErrors,
} from "../type";

type Props = {
  rows: ReservationType[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;

  onChange: (
    id: number,
    field: keyof ReservationType,
    value: string | number | boolean
  ) => void;

  onRemove: (id: number) => void;

  onSelectAll: (checked: boolean) => void;
};

export default function ReservationTypeTable({
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
            {/* Select */}
            <th className="w-10 border-b border-slate-200 px-3 py-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                onChange={(e) =>
                  onSelectAll(e.target.checked)
                }
              />
            </th>

            {/* Number */}
            <th className="w-12 border-b border-slate-200 px-3 py-3">
              #
            </th>

            {/* Code */}
            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Code{" "}
              <span className="text-red-500">*</span>
            </th>

            {/* Name */}
            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Name{" "}
              <span className="text-red-500">*</span>
            </th>

            {/* Group */}
            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Group{" "}
              <span className="text-red-500">*</span>
            </th>

            {/* Display Sequence */}
            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Display Sequence
            </th>

            {/* Default */}
            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">
              Is Default
            </th>

            {/* Action */}
            <th className="w-20 border-b border-slate-200 px-3 py-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={8}
                className="p-8 text-center text-slate-500"
              >
                Loading reservation types...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="p-8 text-center text-slate-500"
              >
                No reservation types found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors =
                errors[row.id] || {};

              return (
                <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                  {/* Select */}
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

                  {/* Number */}
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>

                  {/* Code */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors.code
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.code}
                      title={rowErrors.code || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "code",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black uppercase outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                  </td>

                  {/* Name */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors.name
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.name}
                      title={rowErrors.name || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "name",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                  </td>

                  {/* Group */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors.group
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <select
                      value={row.group}
                      title={rowErrors.group || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "group",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      <option value="WAITLIST">
                        Waitlist
                      </option>

                      <option value="CONFIRM">
                        Confirm
                      </option>

                      <option value="TENTATIVE">
                        Tentative
                      </option>
                    </select>
                    {rowErrors.group && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.group}</p>}
                  </td>

                  {/* Display Sequence */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors.displaySequence
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="number"
                      min={0}
                      value={row.displaySequence}
                      title={
                        rowErrors.displaySequence ||
                        ""
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "displaySequence",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors.displaySequence && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.displaySequence}</p>}
                  </td>

                  {/* Is Default */}
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
                          e.target.value ===
                            "Yes"
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>
                    </select>
                  </td>

                  {/* Delete */}
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        onRemove(row.id)
                      }
                      disabled={rows.length <= 1}
                      aria-label={`Delete ${row.name || "reservation type"} row`}
                      title="Delete row"
                      className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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