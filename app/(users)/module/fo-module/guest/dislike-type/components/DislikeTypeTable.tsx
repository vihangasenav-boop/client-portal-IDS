"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import BulkDataTools from "../../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { useDislikeTypes } from "../hooks/useDislikeTypes";
import { DislikeType } from "../type";

const columns = ["Code", "Name", "Display Sequence", "Is Default", "Is Active"];

function parseBoolean(value: string) {
  return ["yes", "true", "1"].includes(value.trim().toLowerCase());
}

export default function DislikeTypeTable() {
  const {
    rows,
    setRows,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    updateRow,
    addRow,
    save,
    deleteIds,
    deleteAll,
  } = useDislikeTypes();
  const [message, setMessage] = useState("");

  const importRows = (data: string[][]) => {
    const imported: DislikeType[] = data.map(
      ([code, name, displaySequence, isDefault, isActive]) => ({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        displaySequence: displaySequence?.trim() ? Number(displaySequence) : 0,
        isDefault: parseBoolean(isDefault ?? ""),
        isActive: isActive === undefined || isActive.trim() === "" ? true : parseBoolean(isActive),
        selected: false,
      })
    );
    setRows((current) => [
      ...current.filter((row) => row.code.trim() || row.name.trim()),
      ...imported,
    ]);
    setErrors({});
  };

  const removeRows = async (selected: DislikeType[]) => {
    const savedIds = selected.flatMap((row) => (row.id > 0 ? [row.id] : []));
    const result = await deleteIds(savedIds);
    if (!result.success) {
      setMessage(result.message);
      return false;
    }
    const selectedIds = new Set(selected.map((row) => row.id));
    setRows((current) => {
      const remaining = current.filter((row) => !selectedIds.has(row.id));
      return remaining.length
        ? remaining
        : [{
            id: createDraftId(),
            code: "",
            name: "",
            displaySequence: 0,
            isDefault: false,
            isActive: true,
            selected: false,
          }];
    });
    setErrors({});
    setMessage(result.message);
    return true;
  };

  const handleDeleteRow = async (row: DislikeType) => {
    if (row.id > 0 && !window.confirm(`Delete "${row.name || row.code}"?`)) return;
    await removeRows([row]);
  };

  const handleDeleteSelected = async () => {
    const selected = rows.filter((row) => row.selected);
    if (selected.length === 0) {
      setMessage("Select at least one row to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selected.length} selected dislike type row(s)?`)) return;
    await removeRows(selected);
  };

  const handleDeleteAll = async () => {
    const count = rows.filter((row) => row.id > 0).length;
    if (!count || !window.confirm(`Delete all ${count} dislike types?`)) return;
    const result = await deleteAll();
    setMessage(result.message);
  };

  const handleSave = async () => {
    setMessage("");
    const result = await save();
    setMessage(result.message);
  };

  const selectAll = (checked: boolean) => {
    setRows((current) => current.map((row) => ({ ...row, selected: checked })));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Guest setup</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Dislike Types</h1>
            <p className="mt-2 text-sm text-slate-600">Maintain guest dislike types and their display order.</p>
          </div>
          <BulkDataTools
            columns={columns}
            templateName="guest-dislike-types"
            disabled={isLoading || isSaving}
            deleteAllDisabled={!rows.some((row) => row.id > 0)}
            onDeleteAll={handleDeleteAll}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm text-black">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-10 border-b border-slate-200 px-3 py-3">
                <input type="checkbox" aria-label="Select all dislike types" checked={rows.length > 0 && rows.every((row) => row.selected)} onChange={(event) => selectAll(event.target.checked)} className="h-4 w-4" />
              </th>
              <th className="w-12 border-b border-slate-200 px-3 py-3">#</th>
              <th className="min-w-36 border-b border-slate-200 px-3 py-3 text-left">Code <span className="text-red-500">*</span></th>
              <th className="min-w-48 border-b border-slate-200 px-3 py-3 text-left">Name <span className="text-red-500">*</span></th>
              <th className="min-w-36 border-b border-slate-200 px-3 py-3 text-left">Display Sequence</th>
              <th className="min-w-32 border-b border-slate-200 px-3 py-3 text-left">Is Default</th>
              <th className="min-w-32 border-b border-slate-200 px-3 py-3 text-left">Is Active</th>
              <th className="w-20 border-b border-slate-200 px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading dislike types...</td></tr>
            ) : rows.map((row, index) => (
              <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                  <input type="checkbox" checked={row.selected} aria-label={`Select dislike type ${row.name || row.code || index + 1}`} onChange={(event) => updateRow(row.id, "selected", event.target.checked)} className="h-4 w-4" />
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">{index + 1}</td>
                <td className={`border-b border-slate-100 p-0 ${errors[row.id]?.code ? "bg-red-50" : ""}`}>
                  <input value={row.code} aria-label={`Dislike type ${index + 1} code`} aria-invalid={Boolean(errors[row.id]?.code)} title={errors[row.id]?.code || ""} onChange={(event) => updateRow(row.id, "code", event.target.value)} className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400" />
                  {errors[row.id]?.code && <p className="px-3 pb-2 text-xs text-red-600">{errors[row.id].code}</p>}
                </td>
                <td className={`border-b border-slate-100 p-0 ${errors[row.id]?.name ? "bg-red-50" : ""}`}>
                  <input value={row.name} aria-label={`Dislike type ${index + 1} name`} aria-invalid={Boolean(errors[row.id]?.name)} title={errors[row.id]?.name || ""} onChange={(event) => updateRow(row.id, "name", event.target.value)} className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400" />
                  {errors[row.id]?.name && <p className="px-3 pb-2 text-xs text-red-600">{errors[row.id].name}</p>}
                </td>
                <td className={`border-b border-slate-100 p-0 ${errors[row.id]?.displaySequence ? "bg-red-50" : ""}`}>
                  <input type="number" min={0} step={1} value={row.displaySequence} aria-label={`Dislike type ${index + 1} display sequence`} aria-invalid={Boolean(errors[row.id]?.displaySequence)} title={errors[row.id]?.displaySequence || ""} onChange={(event) => updateRow(row.id, "displaySequence", Number(event.target.value))} className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400" />
                  {errors[row.id]?.displaySequence && <p className="px-3 pb-2 text-xs text-red-600">{errors[row.id].displaySequence}</p>}
                </td>
                <td className={`border-b border-slate-100 p-0 ${errors[row.id]?.isDefault ? "bg-red-50" : ""}`}>
                  <select value={row.isDefault ? "Yes" : "No"} aria-label={`Dislike type ${index + 1} default`} aria-invalid={Boolean(errors[row.id]?.isDefault)} onChange={(event) => updateRow(row.id, "isDefault", event.target.value === "Yes")} className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400">
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                  {errors[row.id]?.isDefault && <p className="px-3 pb-2 text-xs text-red-600">{errors[row.id].isDefault}</p>}
                </td>
                <td className="border-b border-slate-100 p-0">
                  <select value={row.isActive ? "Yes" : "No"} aria-label={`Dislike type ${index + 1} active`} onChange={(event) => updateRow(row.id, "isActive", event.target.value === "Yes")} className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400">
                    <option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-center">
                  <button type="button" onClick={() => void handleDeleteRow(row)} aria-label={`Delete ${row.name || "dislike type"} row`} className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={addRow} disabled={isLoading || isSaving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">+ Add Row</button>
          <button type="button" onClick={() => void handleDeleteSelected()} disabled={isSaving || !rows.some((row) => row.selected)} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">Delete Selected</button>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={isSaving || isLoading} className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50">{isSaving ? "Saving..." : "Save Data"}</button>
      </div>
    </div>
  );
}
