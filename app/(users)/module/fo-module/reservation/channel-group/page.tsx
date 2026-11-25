"use client";


import ChannelGroupTable from "./components/ChannelGroupTable";
import { useChannelGroups } from "./hooks/useChannelGroups";
import {
  ChannelGroup,
} from "./type";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import { createDraftId } from "../../business-accounts/bulk-import-utils";
import { pasteGridIntoRows } from "../../grid-paste-utils";
import {
  useDeleteSelectedReservationRows,
  useReservationTableLock,
} from "../hooks/useReservationTableActions";

export default function ChannelGroupPage() {
  const {
    rows,
    setRows,
    errors,
    setErrors,
    isLoading,
    isSaving,
    propertyId,
    propertyIdLoading,
    loadError,
    save,
  } = useChannelGroups();
  const { isLocked, unlock, saveAndLock } =
    useReservationTableLock(isLoading, rows, save);
  const { isDeleting, deleteSelectedRows } =
    useDeleteSelectedReservationRows(
      "/api/modules/fom/channel-group",
      "channel group",
      rows,
      setRows
    );

  // -----------------------------------------
  // Change row
  // -----------------------------------------

  const handleChange = (
    id: number,
    field: keyof ChannelGroup,
    value: string | boolean
  ) => {
    setRows(
      (previous) =>
        previous.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  [field]: value,
                }
              : row
        )
    );
  };

  // -----------------------------------------
  // Add row
  // -----------------------------------------

  const addRow = () => {
    setRows(
      (previous) => [
        ...previous,
        {
          id: createDraftId(),
          code: "",
          name: "",
          selected: false,
        },
      ]
    );
  };

  const importRows = (data: string[][]) => {
    const imported = data.map(([code, name]) => ({
      id: createDraftId(),
      code: code ?? "",
      name: name ?? "",
      selected: false,
    }));

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
          headers: ["Code", "Channel Group Code"],
          apply: (row, value) => ({ ...row, code: value }),
        },
        {
          key: "name",
          headers: ["Name", "Channel Group Name"],
          apply: (row, value) => ({ ...row, name: value }),
        },
      ],
      createRow: () => ({
        id: createDraftId(),
        code: "",
        name: "",
        selected: false,
      }),
    });

  // -----------------------------------------
  // Remove row
  // -----------------------------------------

  const removeRow = async (
    id: number
  ) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete channel group "${row.name || row.code}" and its channels?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/channel-group?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete channel group.");
      } catch (error) {
        console.error("Delete channel group failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete channel group.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      return remaining.length > 0 ? remaining : [{
        id: createDraftId(),
        code: "",
        name: "",
        selected: false,
      }];
    });
    setErrors({});
  };

  // -----------------------------------------
  // Select all
  // -----------------------------------------

  const selectAll = (
    checked: boolean
  ) => {
    setRows(
      (previous) =>
        previous.map(
          (row) => ({
            ...row,
            selected: checked,
          })
        )
    );
  };

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Reservation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Channel Groups</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage channel groups for the FOM module.</p>
          </div>
          <BulkDataTools
            columns={["Code", "Name"]}
            templateName="channel-groups"
            disabled={isLoading || isSaving || isDeleting}
            importDisabled={isLocked}
            instructions={[
              "Code is required, unique, and cannot exceed 8 characters.",
              "Name is required, unique, and must be at least 2 characters.",
              "Keep the Code and Name template headers unchanged.",
            ]}
            onImport={importRows}
          />
        </div>
        {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      </div>

      {/* Table */}
      <ChannelGroupTable
        rows={rows}
        errors={errors}
        isLoading={isLoading}
        onChange={
          handleChange
        }
        onRemove={
          removeRow
        }
        onSelectAll={
          selectAll
        }
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