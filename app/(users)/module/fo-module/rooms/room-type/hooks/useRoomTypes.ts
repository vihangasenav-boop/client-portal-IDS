"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  emptyRow,
  RoomAmenity,
  RoomFeature,
  RoomType,
  RowErrors,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useRoomTypes() {
  const [rows, setRows] = useState<RoomType[]>([
    emptyRow(createDraftId()),
  ]);

  const [roomFeatures, setRoomFeatures] =
    useState<RoomFeature[]>([]);

  const [roomAmenities, setRoomAmenities] =
    useState<RoomAmenity[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  /* =========================================
     LOAD DATA
  ========================================= */

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(
          "/api/modules/fom/room-type",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load room types"
          );
        }

        setRoomFeatures(
          data.roomFeatures ?? []
        );

        setRoomAmenities(
          data.roomAmenities ?? []
        );

        const loaded: RoomType[] =
          (data.roomTypes ?? []).map(
            (row: RoomType) => ({
              id: row.id,
              classification:
                row.classification,
              code: row.code,
              name: row.name,
              upgradeLevel:
                row.upgradeLevel,
              displaySequence:
                row.displaySequence,
              isDefault:
                row.isDefault,
              description:
                row.description ?? "",
              overBooking:
                Number(row.overBooking),
              roomFeatureIds:
                row.roomFeatureIds ?? [],
              roomAmenityIds:
                row.roomAmenityIds ?? [],
              selected: false,
            })
          );

        setRows(
          loaded.length > 0
            ? loaded
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load data"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  /* =========================================
     VALIDATION
  ========================================= */

  const validateRows = (
    dataRows: RoomType[]
  ) => {
    const newErrors: Record<
      number,
      RowErrors
    > = {};

    const codes = new Set<string>();
    const names = new Set<string>();
    const upgradeLevels = new Set<number>();
    const sequences = new Set<number>();

    let isValid = true;

    let defaultSeen = false;

    dataRows.forEach((row) => {
      const rowErrors: RowErrors = {};

      if (
        !["Room", "Pseudo Room", "Component Room"].includes(
          row.classification
        )
      ) {
        rowErrors.classification = "Select a valid classification";
      }

      if (!row.code.trim()) {
        rowErrors.code = "Code is required";
      } else if (
        codes.has(
          row.code.trim().toLowerCase()
        )
      ) {
        rowErrors.code = "Code cannot duplicate";
      }

      if (!row.name.trim()) {
        rowErrors.name = "Name is required";
      } else if (
        names.has(
          row.name.trim().toLowerCase()
        )
      ) {
        rowErrors.name = "Name cannot duplicate";
      }

      if (
        !Number.isInteger(row.upgradeLevel) ||
        row.upgradeLevel < 0
      ) {
        rowErrors.upgradeLevel =
          "Upgrade Level must be a non-negative integer";
      } else if (upgradeLevels.has(row.upgradeLevel)) {
        rowErrors.upgradeLevel =
          "Upgrade Level cannot duplicate";
      }

      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence =
          "Display Sequence must be a non-negative integer";
      } else if (sequences.has(row.displaySequence)) {
        rowErrors.displaySequence =
          "Display Sequence cannot duplicate";
      }

      if (row.code.trim()) codes.add(row.code.trim().toLowerCase());
      if (row.name.trim()) names.add(row.name.trim().toLowerCase());

      if (Number.isInteger(row.upgradeLevel)) {
        upgradeLevels.add(row.upgradeLevel);
      }
      if (Number.isInteger(row.displaySequence)) {
        sequences.add(row.displaySequence);
      }

      if (!Number.isFinite(row.overBooking) || row.overBooking < 0 || row.overBooking > 100) {
        rowErrors.overBooking = "Over booking must be between 0 and 100";
      }

      if (row.isDefault && defaultSeen) {
        rowErrors.isDefault = "Only one room type can be default";
      }
      if (row.isDefault) defaultSeen = true;

      if (Object.keys(rowErrors).length > 0) {
        newErrors[row.id] = rowErrors;
        isValid = false;
      }
    });

    return {
      isValid,
      newErrors,
    };
  };

  /* =========================================
     SAVE
  ========================================= */

  const save = useCallback(async () => {
    const {
      isValid,
      newErrors,
    } = validateRows(rows);

    if (!isValid) {
      setErrors(newErrors);

      alert(
        "Please fix all highlighted errors."
      );

      return;
    }

    try {
      setIsSaving(true);

      const res = await fetch(
        "/api/modules/fom/room-type",
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            rows,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to save room types"
        );
      }

      const savedRows: RoomType[] = (data.roomTypes ?? []).map(
        (row: RoomType) => ({
          ...row,
          overBooking: Number(row.overBooking),
          roomFeatureIds: row.roomFeatureIds ?? [],
          roomAmenityIds: row.roomAmenityIds ?? [],
          selected: false,
        })
      );
      setRows(
        savedRows.length > 0
          ? savedRows
          : [emptyRow(createDraftId())]
      );
      setErrors({});

      alert(
        "Room types saved successfully!"
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save data"
      );
    } finally {
      setIsSaving(false);
    }
  }, [rows]);

  return {
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
  };
}