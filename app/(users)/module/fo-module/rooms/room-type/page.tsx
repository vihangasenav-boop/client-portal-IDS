"use client";

import { useRoomTypes } from "./hooks/useRoomTypes";
import RoomTypeTable from "./components/RoomTypeTable";
import { RoomType, emptyRow } from "./type";
import BulkDataTools from "../../business-accounts/components/BulkDataTools";
import {
  createDraftId,
  parseImportBoolean,
} from "../../business-accounts/bulk-import-utils";

export default function RoomTypePage() {
  const {
    rows,
    setRows,
    roomFeatures,
    roomAmenities,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    save,
  } = useRoomTypes();

  const handleChange = (
    id: number,
    field: keyof RoomType,
    value:
      | string
      | number
      | boolean
      | number[]
  ) => {
    setErrors({});
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

  const addRow = () => {
    const nextUpgradeLevel =
      Math.max(-1, ...rows.map((row) => row.upgradeLevel)) + 1;
    const nextDisplaySequence =
      Math.max(-1, ...rows.map((row) => row.displaySequence)) + 1;

    setRows((previous) => [
      ...previous,
      {
        ...emptyRow(createDraftId()),
        upgradeLevel: nextUpgradeLevel,
        displaySequence: nextDisplaySequence,
      },
    ]);
  };

  const importRows = (data: string[][]) => {
    const imported: RoomType[] = [];
    const nextUpgradeLevel =
      Math.max(-1, ...rows.map((row) => row.upgradeLevel)) + 1;
    const nextDisplaySequence =
      Math.max(-1, ...rows.map((row) => row.displaySequence)) + 1;

    for (const [index, values] of data.entries()) {
      const [
        classificationValue,
        code,
        name,
        upgradeLevel,
        displaySequence,
        isDefault,
        description,
        overBooking,
        featureCodes,
        amenityCodes,
      ] = values;

      const classification = ({
        room: "Room",
        "pseudo room": "Pseudo Room",
        "component room": "Component Room",
      } as Record<string, string>)[
        (classificationValue ?? "").trim().toLowerCase()
      ];
      if (!classification) {
        return `Row ${index + 1}: Classification must be Room, Pseudo Room, or Component Room.`;
      }

      const resolveCodes = (
        raw: string | undefined,
        options: { id: number; code: string }[],
        label: string
      ) => {
        const requested = (raw ?? "")
          .split(/[;,]/)
          .map((value) => value.trim())
          .filter(Boolean);
        const matched = requested.map((requestedCode) =>
          options.find(
            (option) =>
              option.code.trim().toLowerCase() ===
              requestedCode.toLowerCase()
          )
        );
        const missing = requested.filter((_, optionIndex) => !matched[optionIndex]);

        return missing.length > 0
          ? `${label}: ${missing.join(", ")}`
          : matched.flatMap((option) => (option ? [option.id] : []));
      };

      const featureIds = resolveCodes(
        featureCodes,
        roomFeatures,
        `Row ${index + 1} has unknown room feature code(s)`
      );
      if (typeof featureIds === "string") return featureIds;

      const amenityIds = resolveCodes(
        amenityCodes,
        roomAmenities,
        `Row ${index + 1} has unknown room amenity code(s)`
      );
      if (typeof amenityIds === "string") return amenityIds;

      imported.push({
        id: createDraftId(),
        classification,
        code: code ?? "",
        name: name ?? "",
        upgradeLevel: upgradeLevel?.trim()
          ? Number(upgradeLevel)
          : nextUpgradeLevel + index,
        displaySequence: displaySequence?.trim()
          ? Number(displaySequence)
          : nextDisplaySequence + index,
        isDefault: parseImportBoolean(isDefault),
        description: description ?? "",
        overBooking: overBooking?.trim()
          ? Number(overBooking)
          : 0,
        roomFeatureIds: featureIds,
        roomAmenityIds: amenityIds,
        selected: false,
      });
    }

    setRows((previous) => [
      ...previous.filter((row) => row.code.trim() || row.name.trim()),
      ...imported,
    ]);
  };

  const deleteAllRows = async () => {
    const savedCount = rows.filter((row) => row.id > 0).length;
    if (
      savedCount === 0 ||
      !window.confirm(
        `Permanently delete all ${savedCount} room types for this property? Their feature and amenity assignments will also be removed.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "/api/modules/fom/room-type?all=true",
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete all room types.");
      }

      setRows([emptyRow(createDraftId())]);
      setErrors({});
    } catch (error) {
      console.error("Delete all room types failed:", error);
      alert(error instanceof Error ? error.message : "Could not delete all room types.");
    }
  };

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete room type "${row.name || row.code}"?`)) return;

      try {
        const response = await fetch(
          `/api/modules/fom/room-type?id=${id}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not delete room type.");
        }
      } catch (error) {
        console.error("Delete room type failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete room type.");
        return;
      }
    }

    setRows((previous) => {
      const remaining = previous.filter((row) => row.id !== id);
      return remaining.length > 0
        ? remaining
        : [emptyRow(createDraftId())];
    });
    setErrors({});
  };

  const selectAll = (checked: boolean) => {
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
              Room Types
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Configure room classifications and their feature and amenity assignments.
              Enter multiple feature or amenity codes separated by commas in the spreadsheet.
            </p>
          </div>
          <BulkDataTools
            columns={[
              "Classification",
              "Code",
              "Name",
              "Upgrade Level",
              "Display Sequence",
              "Is Default",
              "Description",
              "Over Booking %",
              "Room Feature Codes",
              "Room Amenity Codes",
            ]}
            templateName="room-types"
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
      <RoomTypeTable
        rows={rows}
        roomFeatures={roomFeatures}
        roomAmenities={roomAmenities}
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
          disabled={isSaving || isLoading}
          className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : "Save Data"}
        </button>
      </div>
    </div>
  );
}