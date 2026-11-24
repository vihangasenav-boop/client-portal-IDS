"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import BulkDataTools from "../../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { useOffers } from "../hooks/useOffers";
import { Offer } from "../type";

export default function OfferTable() {
  const {
    rows,
    setRows,
    errors,
    isLoading,
    isSaving,
    loadError,
    updateRow,
    addRow,
    save,
    deleteIds,
    deleteAll,
  } = useOffers();
  const [message, setMessage] = useState("");

  const importRows = (data: string[][]) => {
    const imported = data.map(
      ([code, name, description, startDate, endDate]) => ({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        description: description ?? "",
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        selected: false,
      })
    );
    setRows((current) => [
      ...current.filter(
        (row) =>
          row.code.trim() || row.name.trim()
      ),
      ...imported,
    ]);
  };

  const handleSave = async () => {
    const result = await save();
    setMessage(result.success ? result.message : "");
  };

  const handleDeleteRow = async (row: Offer) => {
    if (row.id <= 0) {
      setRows((current) =>
        current.filter((item) => item.id !== row.id)
      );
      return;
    }
    if (
      !window.confirm(
        `Delete offer "${row.name || row.code}"?`
      )
    ) return;
    const result = await deleteIds([row.id]);
    setMessage(result.message);
    if (result.success) {
      setRows((current) =>
        current.filter((item) => item.id !== row.id)
      );
    }
  };

  const handleDeleteSelected = async () => {
    const selected = rows.filter((row) => row.selected);
    const savedIds = selected.flatMap((row) =>
      row.id > 0 ? [row.id] : []
    );
    if (savedIds.length > 0) {
      if (
        !window.confirm(
          `Delete ${savedIds.length} selected offer row(s)?`
        )
      ) return;
      const result = await deleteIds(savedIds);
      setMessage(result.message);
      if (!result.success) return;
    }
    setRows((current) =>
      current.filter((row) => !row.selected)
    );
  };

  const handleDeleteAll = async () => {
    const savedCount = rows.filter(
      (row) => row.id > 0
    ).length;
    if (
      !savedCount ||
      !window.confirm(
        `Delete all ${savedCount} offers?`
      )
    ) return;
    const result = await deleteAll();
    setMessage(result.message);
  };

  const selectAll = (checked: boolean) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        selected: checked,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Miscellaneous
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Offers
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Maintain property offers and their validity periods.
            </p>
          </div>
          <BulkDataTools
            columns={[
              "Code",
              "Name",
              "Description",
              "Start Date",
              "End Date",
            ]}
            templateName="offers"
            disabled={isLoading || isSaving}
            deleteAllDisabled={
              !rows.some((row) => row.id > 0)
            }
            onDeleteAll={handleDeleteAll}
            onImport={importRows}
          />
        </div>
        {(loadError || message) && (
          <p
            role={loadError ? "alert" : "status"}
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              loadError
                ? "bg-red-50 text-red-700"
                : "bg-slate-50 text-slate-700"
            }`}
          >
            {loadError || message}
          </p>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm text-black">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-10 border-b border-slate-200 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all offers"
                  checked={
                    rows.length > 0 &&
                    rows.every((row) => row.selected)
                  }
                  onChange={(event) =>
                    selectAll(event.target.checked)
                  }
                  className="h-4 w-4"
                />
              </th>
              <th className="w-12 border-b border-slate-200 px-3 py-3">
                #
              </th>
              <th className="min-w-40 border-b border-slate-200 px-3 py-3 text-left">
                Code <span className="text-red-500">*</span>
              </th>
              <th className="min-w-56 border-b border-slate-200 px-3 py-3 text-left">
                Name <span className="text-red-500">*</span>
              </th>
              <th className="min-w-64 border-b border-slate-200 px-3 py-3 text-left">
                Description
              </th>
              <th className="min-w-40 border-b border-slate-200 px-3 py-3 text-left">
                Start Date <span className="text-red-500">*</span>
              </th>
              <th className="min-w-40 border-b border-slate-200 px-3 py-3 text-left">
                End Date <span className="text-red-500">*</span>
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
                  colSpan={8}
                  className="p-8 text-center text-slate-500"
                >
                  Loading offers...
                </td>
              </tr>
            ) : rows.map((row, index) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-orange-50/40"
              >
                <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    aria-label={`Select offer ${row.name || row.code || index + 1}`}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        "selected",
                        event.target.checked
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
                    errors[row.id]?.code ? "bg-red-50" : ""
                  }`}
                >
                  <input
                    value={row.code}
                    aria-label={`Offer ${index + 1} code`}
                    aria-invalid={Boolean(errors[row.id]?.code)}
                    onChange={(event) =>
                      updateRow(row.id, "code", event.target.value)
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {errors[row.id]?.code && (
                    <p className="px-3 pb-2 text-xs text-red-600">
                      {errors[row.id].code}
                    </p>
                  )}
                </td>
                <td
                  className={`border-b border-slate-100 p-0 ${
                    errors[row.id]?.name ? "bg-red-50" : ""
                  }`}
                >
                  <input
                    value={row.name}
                    aria-label={`Offer ${index + 1} name`}
                    aria-invalid={Boolean(errors[row.id]?.name)}
                    onChange={(event) =>
                      updateRow(row.id, "name", event.target.value)
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {errors[row.id]?.name && (
                    <p className="px-3 pb-2 text-xs text-red-600">
                      {errors[row.id].name}
                    </p>
                  )}
                </td>
                <td className="border-b border-slate-100 p-0">
                  <textarea
                    value={row.description}
                    aria-label={`Offer ${index + 1} description`}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        "description",
                        event.target.value
                      )
                    }
                    className="min-h-[44px] w-full resize-y bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                </td>
                <td
                  className={`border-b border-slate-100 p-0 ${
                    errors[row.id]?.startDate
                      ? "bg-red-50"
                      : ""
                  }`}
                >
                  <input
                    type="date"
                    value={row.startDate}
                    aria-label={`Offer ${index + 1} start date`}
                    aria-invalid={Boolean(
                      errors[row.id]?.startDate
                    )}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        "startDate",
                        event.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {errors[row.id]?.startDate && (
                    <p className="px-3 pb-2 text-xs text-red-600">
                      {errors[row.id].startDate}
                    </p>
                  )}
                </td>
                <td
                  className={`border-b border-slate-100 p-0 ${
                    errors[row.id]?.endDate
                      ? "bg-red-50"
                      : ""
                  }`}
                >
                  <input
                    type="date"
                    value={row.endDate}
                    aria-label={`Offer ${index + 1} end date`}
                    aria-invalid={Boolean(
                      errors[row.id]?.endDate
                    )}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        "endDate",
                        event.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {errors[row.id]?.endDate && (
                    <p className="px-3 pb-2 text-xs text-red-600">
                      {errors[row.id].endDate}
                    </p>
                  )}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => void handleDeleteRow(row)}
                    aria-label={`Delete ${row.name || "offer"} row`}
                    className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
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
            onClick={() => void handleDeleteSelected()}
            disabled={
              isSaving ||
              !rows.some((row) => row.selected)
            }
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Selected
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading}
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Data"}
        </button>
      </div>
    </div>
  );
}
