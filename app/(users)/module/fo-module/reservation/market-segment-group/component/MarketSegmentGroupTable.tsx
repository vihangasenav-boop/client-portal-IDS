"use client";

import { Trash2 } from "lucide-react";
import { handleGridPasteEvent } from "../../../grid-paste-utils";
import React from "react";
import {
  MarketSegmentGroup,
  RowErrors,
} from "../type";

type Props = {
  rows: MarketSegmentGroup[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;
  isLocked: boolean;

  onChange: (
    id: number,
    field: keyof MarketSegmentGroup,
    value: string | boolean
  ) => void;

  onRemove: (id: number) => void;

  onSelectAll: (checked: boolean) => void;
  onPasteGrid: (
    startRow: number,
    startField: string,
    clipboardText: string
  ) => boolean;
};

export default function MarketSegmentGroupTable({
  rows,
  errors,
  isLoading,
  isLocked,
  onChange,
  onRemove,
  onSelectAll,
  onPasteGrid,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <fieldset disabled={isLocked} className="contents">
      <table
        className="w-full border-separate border-spacing-0 text-sm text-black"
        onPaste={(event) =>
          handleGridPasteEvent(event, isLocked, onPasteGrid)
        }
      >
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

            <th className="w-20 border-b border-slate-200 px-3 py-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={5}
                className="p-8 text-center text-slate-500"
              >
                Loading market segment groups...
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const codeError =
                errors[row.id]?.code;

              const nameError =
                errors[row.id]?.name;

              return (
                <tr key={row.id}>
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
                      maxLength={8}
                      data-grid-row={index}
                      data-grid-field="code"
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
                      minLength={2}
                      data-grid-row={index}
                      data-grid-field="name"
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
                      aria-label={`Delete ${row.name || "market segment group"} row`}
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
      </fieldset>
    </div>
  );
}