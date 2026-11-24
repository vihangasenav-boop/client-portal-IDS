"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RoomFloor,
  RowErrors,
  emptyRow,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useRoomFloors() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<RoomFloor[]>([
    emptyRow(createDraftId()),
  ]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  // -----------------------------------------
  // Get property
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setPropertyIdLoading(true);

        const res = await fetch(
          "/api/auth/auth-me",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error("Unauthorized");
        }

        const data = await res.json();

        if (cancelled) return;

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          setLoadError(
            "No property selected for this user."
          );
          return;
        }

        setPropertyId(
          String(userPropertyId)
        );
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            "Unable to resolve property selection."
          );
        }
      } finally {
        if (!cancelled) {
          setPropertyIdLoading(false);
        }
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------
  // Load room floors
  // -----------------------------------------

  useEffect(() => {
    if (
      propertyIdLoading ||
      !propertyId
    ) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(
          "/api/modules/fom/room-floor",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load room floors"
          );
        }

        if (cancelled) return;

        const loaded: RoomFloor[] =
          (
            data.roomFloors ?? []
          ).map((item: any) => ({
            id: item.id,
            floorCode: item.floorCode,
            floorName: item.floorName,
            isDefault: item.isDefault,
            selected: false,
          }));

        setRows(
          loaded.length > 0
            ? loaded
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            "Could not load existing room floors."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    propertyId,
    propertyIdLoading,
  ]);

  // -----------------------------------------
  // Validation
  // -----------------------------------------

  const validateRows = (
    dataRows: RoomFloor[]
  ) => {
    const newErrors: Record<
      number,
      RowErrors
    > = {};

    const codeCounts: Record<
      string,
      number
    > = {};

    const nameCounts: Record<
      string,
      number
    > = {};

    dataRows.forEach((row) => {
      const code =
        row.floorCode
          .trim()
          .toLowerCase();

      const name =
        row.floorName
          .trim()
          .toLowerCase();

      if (code) {
        codeCounts[code] =
          (codeCounts[code] || 0) + 1;
      }

      if (name) {
        nameCounts[name] =
          (nameCounts[name] || 0) + 1;
      }
    });

    let isValid = true;

    dataRows.forEach((row) => {
      const code =
        row.floorCode.trim();

      const name =
        row.floorName.trim();

      const rowErrors: RowErrors = {};

      if (!code) {
        rowErrors.floorCode =
          "Floor code is required";
        isValid = false;
      } else if (
        codeCounts[
          code.toLowerCase()
        ] > 1
      ) {
        rowErrors.floorCode =
          "Floor code must be unique";
        isValid = false;
      }

      if (!name) {
        rowErrors.floorName =
          "Floor name is required";
        isValid = false;
      } else if (
        nameCounts[
          name.toLowerCase()
        ] > 1
      ) {
        rowErrors.floorName =
          "Floor name must be unique";
        isValid = false;
      }

      if (
        rowErrors.floorCode ||
        rowErrors.floorName
      ) {
        newErrors[row.id] =
          rowErrors;
      }
    });

    return {
      isValid,
      newErrors,
    };
  };

  // -----------------------------------------
  // Save
  // -----------------------------------------

  const save = useCallback(
    async () => {
      if (!propertyId) {
        alert("No property selected.");
        return;
      }

      const {
        isValid,
        newErrors,
      } = validateRows(rows);

      if (!isValid) {
        setErrors(newErrors);

        alert(
          "Please fix all highlighted errors before saving."
        );

        return;
      }

      try {
        setIsSaving(true);

        const res = await fetch(
          "/api/modules/fom/room-floor",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              rows: rows.map((row) => ({
                id: row.id,
                floorCode:
                  row.floorCode,
                floorName:
                  row.floorName,
                isDefault:
                  row.isDefault,
              })),
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          alert(
            data?.error ||
              "Failed to save room floors."
          );
          return;
        }

        const saved: RoomFloor[] =
          (
            data.roomFloors ?? []
          ).map((row: any) => ({
            id: row.id,
            floorCode:
              row.floorCode,
            floorName:
              row.floorName,
            isDefault:
              row.isDefault,
            selected: false,
          }));

        setRows(saved);
        setErrors({});

        alert(
          "Room floors saved successfully!"
        );
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save data. Please try again."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [propertyId, rows]
  );

  return {
    propertyId,
    propertyIdLoading,

    rows,
    setRows,

    errors,
    setErrors,

    isLoading,
    isSaving,

    loadError,

    validateRows,
    save,
  };
}