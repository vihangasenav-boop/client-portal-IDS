"use client";


import ChannelTable from "./components/ChannelTable";

import {
  Channel,
  emptyRow,
} from "./type";

import { useChannels } from "./hooks/useChannels";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../business-accounts/bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import {
  useDeleteSelectedReservationRows,
  useReservationTableLock,
} from "../hooks/useReservationTableActions";

export default function ChannelPage() {
  const {
    rows,
    setRows,
    groups,
    errors,
    setErrors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useChannels();
  const { isLocked, unlock, saveAndLock } =
    useReservationTableLock(isLoading, rows, save);
  const { isDeleting, deleteSelectedRows } =
    useDeleteSelectedReservationRows(
      "/api/modules/fom/channel",
      "channel",
      rows,
      setRows
    );

  // =====================================================
  // CHANGE ROW
  // =====================================================

  const handleChange = (
    id: number,
    field: keyof Channel,
    value: string | number | boolean
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // =====================================================
  // ADD ROW
  // =====================================================

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      emptyRow(
        createDraftId(),
        Math.max(0, ...previous.map((row) => row.displaySequence)) + 1
      ),
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: Channel[] = [];

    for (const [index, [code, name, groupCode, displaySequence]] of data.entries()) {
      const group = groups.find(
        (option) => option.code.trim().toLowerCase() === (groupCode ?? "").trim().toLowerCase()
      );
      if (!group) {
        return `Row ${index + 1}: Unknown channel group code "${groupCode ?? ""}".`;
      }

      imported.push({
        id: createDraftId(),
        code: code ?? "",
        name: name ?? "",
        channelGroupId: group.id,
        displaySequence: displaySequence?.trim()
          ? Number(displaySequence)
          : rows.length + index + 1,
        selected: false,
      });
    }

    setRows((previous) => [
      ...previous.filter((row) => row.code.trim() || row.name.trim()),
      ...imported,
    ]);
    setErrors({});
  };

  const pasteIntoGrid = (
    startRow: number,
    startField: string,
    clipboardText: string
  ) =>
    pasteGridIntoRows({
      startRow,
      startField,
      clipboardText,
      setRows,
      columns: [
        {
          key: "code",
          headers: ["Code", "Channel Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Channel Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
        {
          key: "channelGroupId",
          headers: [
            "Channel Group",
            "Channel Group Code",
            "Channel Group Name",
          ],
          apply: (row, value) => {
            const normalizedValue = value.trim().toLowerCase();
            const group = groups.find(
              (option) =>
                option.code.trim().toLowerCase() === normalizedValue ||
                option.name.trim().toLowerCase() === normalizedValue
            );
            return {
              ...row,
              channelGroupId: group?.id ?? 0,
            };
          },
        },
        {
          key: "displaySequence",
          headers: ["Display Sequence", "Sequence"],
          apply: (row, value) => ({
            ...row,
            displaySequence: Number(value),
          }),
        },
      ],
      createRow: (existingRows) =>
        emptyRow(
          createDraftId(),
          Math.max(
            0,
            ...existingRows.map((row) => row.displaySequence)
          ) + 1
        ),
    });

  // =====================================================
  // REMOVE ROW
  // =====================================================

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete channel "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/channel?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete channel.");
      } catch (error) {
        console.error("Delete channel failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete channel.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [emptyRow(createDraftId())];
    });
    setErrors({});
  };

  // =====================================================
  // SELECT ALL
  // =====================================================

  const selectAll = (
    checked: boolean
  ) => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        selected: checked,
      }))
    );
  };

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Channels</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage channels configured for the property.</p>
          </div>
          <BulkDataTools
            columns={["Code", "Name", "Channel Group Code", "Display Sequence"]}
            templateName="channels"
            disabled={isLoading || isSaving || isDeleting}
            importDisabled={isLocked}
            instructions={[
              "Code is required, unique, and cannot exceed 8 characters.",
              "Name is required and must be at least 2 characters.",
              "Enter an existing Channel Group Code.",
              "Keep the template column headers unchanged.",
            ]}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      {/* Table */}
      <ChannelTable
        rows={rows}
        groups={groups}
        errors={errors}
        isLoading={isLoading}
        onChange={handleChange}
        onRemove={removeRow}
        onSelectAll={selectAll}
        onPasteGrid={pasteIntoGrid}
        isLocked={isLocked}
      />

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <button
          type="button"
          onClick={addRow}
          disabled={isLocked || isLoading || isSaving || isDeleting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Row
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void deleteSelectedRows()}
            disabled={isLocked || isLoading || isSaving || isDeleting || !rows.some((row) => row.selected)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={isLocked ? unlock : () => void saveAndLock()}
            disabled={!isLocked && (isSaving || isLoading || propertyIdLoading || !propertyId || isDeleting)}
            className={isLocked
              ? "rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              : "rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"}
          >
            {isLocked
              ? "Edit"
              : isSaving
                ? "Saving..."
                : propertyIdLoading
                  ? "Resolving property..."
                  : !propertyId
                    ? "No property selected"
                    : "Save Data"}
          </button>
        </div>

      </div>
    </div>
  );
}