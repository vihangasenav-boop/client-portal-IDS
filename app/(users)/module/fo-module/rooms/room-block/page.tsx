"use client";

import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import {
    createDraftId,
    parseImportBoolean,
} from "../../business-accounts/bulk-import-utils";
import RoomBlockTable from "./components/RoomBlockTable";
import {
    RoomBlock,
} from "./type";
import { useRoomBlocks } from "./hooks/useRoomBlocks";

export default function RoomBlockPage() {
    const {
        rows,
        setRows,
        errors,
        isLoading,
        isSaving,
        propertyId,
        propertyIdLoading,
        loadError,
        save,
    } = useRoomBlocks();

    // --------------------------------
    // Change row
    // --------------------------------

    const handleChange = (
        id: number,
        field: keyof RoomBlock,
        value: string | boolean
    ) => {
        setRows((previous) =>
            previous.map((row) => {
                if (row.id !== id) {
                    return row;
                }

                // Only one default allowed
                if (
                    field === "isDefault" &&
                    value === true
                ) {
                    return {
                        ...row,
                        isDefault: true,
                    };
                }

                return {
                    ...row,
                    [field]: value,
                };
            })
        );

        // If setting default,
        // remove default from others
        if (
            field === "isDefault" &&
            value === true
        ) {
            setRows((previous) =>
                previous.map((row) => ({
                    ...row,
                    isDefault:
                        row.id === id,
                }))
            );
        }
    };

    // --------------------------------
    // Add row
    // --------------------------------

    const addRow = () => {
        setRows((previous) => [
            ...previous,
            {
                id: createDraftId(),
                blockCode: "",
                blockName: "",
                isDefault: false,
                selected: false,
            },
        ]);
    };

    const importRows = (data: string[][]) => {
        const imported = data.map(([blockCode, blockName, isDefault]) => ({
            id: createDraftId(),
            blockCode: blockCode ?? "",
            blockName: blockName ?? "",
            isDefault: parseImportBoolean(isDefault),
            selected: false,
        }));

        setRows((previous) => [
            ...previous.filter((row) => row.blockCode.trim() || row.blockName.trim()),
            ...imported,
        ]);
    };

    const deleteAllRows = async () => {
        const savedCount = rows.filter((row) => row.id > 0).length;
        if (
            savedCount === 0 ||
            !window.confirm(
                `Permanently delete all ${savedCount} room blocks for this property? This cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                "/api/modules/fom/room-block?all=true",
                { method: "DELETE", credentials: "include" }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Could not delete all room blocks.");
            }

            setRows([{
                id: createDraftId(),
                blockCode: "",
                blockName: "",
                isDefault: false,
                selected: false,
            }]);
        } catch (error) {
            console.error("Delete all room blocks failed:", error);
            alert(error instanceof Error ? error.message : "Could not delete all room blocks.");
        }
    };

    // --------------------------------
    // Remove row
    // --------------------------------

    const removeRow = async (id: number) => {
        const row = rows.find((item) => item.id === id);
        if (!row) return;

        if (id > 0) {
            if (!window.confirm(`Delete room block "${row.blockName || row.blockCode}"?`)) return;

            try {
                const response = await fetch(
                    `/api/modules/fom/room-block?id=${id}`,
                    { method: "DELETE", credentials: "include" }
                );
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data?.error || "Could not delete room block.");
                }
            } catch (error) {
                console.error("Delete room block failed:", error);
                alert(error instanceof Error ? error.message : "Could not delete room block.");
                return;
            }
        }

        setRows((previous) =>
            previous.filter(
                (row) => row.id !== id
            )
        );
    };

    // --------------------------------
    // Select all
    // --------------------------------

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
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                            Rooms
                        </p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">
                            Room Blocks
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            Manage room blocks and their default designation for this property.
                        </p>
                    </div>
                    <BulkDataTools
                        columns={["Block Code", "Block Name", "Is Default"]}
                        templateName="room-blocks"
                        disabled={isLoading || isSaving}
                        deleteAllDisabled={!rows.some((row) => row.id > 0)}
                        onDeleteAll={deleteAllRows}
                        onImport={importRows}
                    />
                </div>
                {loadError && (
                    <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {loadError}
                    </p>
                )}
            </div>

            {/* Table */}

            <RoomBlockTable
                rows={rows}
                errors={errors}
                isLoading={isLoading}
                onChange={handleChange}
                onRemove={removeRow}
                onSelectAll={selectAll}
            />

            {/* Footer */}

            <div className="flex flex-wrap justify-between gap-3">
                <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    + Add Row
                </button>

                <button
                    type="button"
                    onClick={save}
                    disabled={
                        isSaving ||
                        isLoading ||
                        propertyIdLoading ||
                        !propertyId
                    }
                    className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                >
                    {isSaving
                        ? "Saving..."
                        : propertyIdLoading
                            ? "Resolving property..."
                            : !propertyId
                                ? "No property selected"
                                : "Save Data"}
                </button>
            </div>
        </div>
    );
}