"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import {
  BusinessSource,
  BusinessSourceGroup,
  RowErrors,
} from "../type";

type Props = {
  rows: BusinessSource[];
  groups: BusinessSourceGroup[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;

  onChange: (
    id: number,
    field: keyof BusinessSource,
    value: string | number | boolean
  ) => void;

  onRemove: (id: number) => void;

  onSelectAll: (checked: boolean) => void;
};

export default function BusinessSourceTable({
  rows,
  groups,
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
                  onSelectAll(
                    e.target.checked
                  )
                }
              />
            </th>

            <th className="w-12 border-b border-slate-200 px-3 py-3">
              #
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Code{" "}
              <span className="text-red-500">
                *
              </span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Name{" "}
              <span className="text-red-500">
                *
              </span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Business Source Group{" "}
              <span className="text-red-500">
                *
              </span>
            </th>

            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">
              Display Sequence
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
                colSpan={7}
                className="p-8 text-center text-slate-500"
              >
                Loading business sources...
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const codeError =
                errors[row.id]?.code;

              const nameError =
                errors[row.id]?.name;

              const groupError =
                errors[row.id]
                  ?.businessSourceGroupId;

              const sequenceError =
                errors[row.id]
                  ?.displaySequence;

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
                      codeError
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.code}
                      title={
                        codeError || ""
                      }
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

                  {/* Name */}
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
                      title={
                        nameError || ""
                      }
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

                  {/* Business Source Group */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      groupError
                        ? "bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <select
                      value={
                        row.businessSourceGroupId ||
                        ""
                      }
                      title={
                        groupError || ""
                      }
                      onChange={(e) =>
                        onChange(
                          row.id,
                          "businessSourceGroupId",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    >
                      <option value="">
                        Select Group
                      </option>

                      {groups.map(
                        (group) => (
                          <option
                            key={group.id}
                            value={group.id}
                          >
                            {group.code} -{" "}
                            {group.name}
                          </option>
                        )
                      )}
                    </select>
                    {groupError && <p className="px-3 pb-2 text-xs text-red-600">{groupError}</p>}
                  </td>

                  {/* Display Sequence */}
                  <td
                    className={`border-b border-slate-100 p-0 ${
                      sequenceError
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
                        sequenceError || ""
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
                    {sequenceError && <p className="px-3 pb-2 text-xs text-red-600">{sequenceError}</p>}
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
                      aria-label={`Delete ${row.name || "business source"} row`}
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