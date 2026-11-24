"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import {
  CancellationRule,
  CancellationRuleType,
  CANCELLATION_RULE_TYPES,
  RowErrors,
} from "../type";

type Props = {
  rows: CancellationRule[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;

  onChange: (
    id: number,
    field: keyof CancellationRule,
    value: string | number | boolean
  ) => void;

  onRemove: (id: number) => void;

  onSelectAll: (checked: boolean) => void;
};

export default function CancellationRuleTable({
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
                className="h-4 w-4"
                onChange={(e) =>
                  onSelectAll(e.target.checked)
                }
              />
            </th>

            <th className="w-12 border-b border-slate-200 px-3 py-3">
              #
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Code{" "}
              <span className="text-red-500">*</span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Name{" "}
              <span className="text-red-500">*</span>
            </th>

            <th className="w-48 border-b border-slate-200 px-3 py-3 text-left">
              Type{" "}
              <span className="text-red-500">*</span>
            </th>

            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">
              Amount
            </th>

            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Days Before Arrival
            </th>

            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Display Sequence
            </th>

            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Cancel Before Time
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
                colSpan={10}
                className="p-8 text-center text-slate-500"
              >
                Loading cancellation rules...
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors[row.id];

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
                      rowErrors?.code
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.code}
                      title={rowErrors?.code || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "code",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                  </td>

                  {/* Name */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.name
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.name}
                      title={rowErrors?.name || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "name",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                  </td>

                  {/* Type */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.type
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <select
                      value={row.type}
                      title={rowErrors?.type || ""}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "type",
                          e.target.value as CancellationRuleType
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      {CANCELLATION_RULE_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                    {rowErrors?.type && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.type}</p>}
                  </td>

                  {/* Amount */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.amount
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      title={
                        rowErrors?.amount || ""
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "amount",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.amount && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.amount}</p>}
                  </td>

                  {/* Days Before Arrival */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.daysBeforeArrival
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        row.daysBeforeArrival
                      }
                      title={
                        rowErrors?.daysBeforeArrival ||
                        ""
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "daysBeforeArrival",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.daysBeforeArrival && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.daysBeforeArrival}</p>}
                  </td>

                  {/* Display Sequence */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.displaySequence
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        row.displaySequence
                      }
                      title={
                        rowErrors?.displaySequence ||
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
                    {rowErrors?.displaySequence && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.displaySequence}</p>}
                  </td>

                  {/* Cancel Before Time */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      rowErrors?.cancelBeforeTime
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="time"
                      value={
                        row.cancelBeforeTime
                      }
                      title={
                        rowErrors?.cancelBeforeTime ||
                        ""
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "cancelBeforeTime",
                          e.target.value
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    />
                    {rowErrors?.cancelBeforeTime && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.cancelBeforeTime}</p>}
                  </td>

                  {/* Delete */}
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        onRemove(row.id)
                      }
                      disabled={
                        rows.length <= 1
                      }
                      aria-label={`Delete ${row.name || "cancellation rule"} row`}
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