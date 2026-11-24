"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RoomAmenity,
  RowErrors,
  emptyRow,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useRoomAmenities() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<RoomAmenity[]>([
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

  // Get logged-in property
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

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Unauthorized"
          );
        }

        if (cancelled) return;

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          throw new Error(
            "No property selected for this user."
          );
        }

        setPropertyId(String(userPropertyId));
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to resolve property."
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

  // Load Room Amenities
  useEffect(() => {
    if (propertyIdLoading || !propertyId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(
          "/api/modules/fom/room-amenity",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load room amenities"
          );
        }

        if (cancelled) return;

        const loaded: RoomAmenity[] =
          (data.roomAmenities ?? []).map(
            (item: any) => ({
              id: item.id,
              code: item.code,
              name: item.name,
              isDefault: item.isDefault,
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

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load room amenities."
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
  }, [propertyId, propertyIdLoading]);

  // Validate
  const validateRows = (
    dataRows: RoomAmenity[]
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
        row.code.trim().toLowerCase();

      const name =
        row.name.trim().toLowerCase();

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
      const rowErrors: RowErrors = {};

      const code = row.code.trim();
      const name = row.name.trim();

      if (!code) {
        rowErrors.code = "Code is required";
        isValid = false;
      } else if (
        codeCounts[code.toLowerCase()] > 1
      ) {
        rowErrors.code =
          "Code must be unique";
        isValid = false;
      }

      if (!name) {
        rowErrors.name = "Name is required";
        isValid = false;
      } else if (
        nameCounts[name.toLowerCase()] > 1
      ) {
        rowErrors.name =
          "Name must be unique";
        isValid = false;
      }

      if (
        rowErrors.code ||
        rowErrors.name
      ) {
        newErrors[row.id] = rowErrors;
      }
    });

    return {
      isValid,
      newErrors,
    };
  };

  // Save
  const save = useCallback(async () => {
    const { isValid, newErrors } =
      validateRows(rows);

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
        "/api/modules/fom/room-amenity",
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
              code: row.code,
              name: row.name,
              isDefault: row.isDefault,
            })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to save room amenities"
        );
      }

      const saved: RoomAmenity[] =
        (data.roomAmenities ?? []).map(
          (item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            isDefault: item.isDefault,
            selected: false,
          })
        );

      setRows(saved);
      setErrors({});

      alert("Data saved successfully!");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save data."
      );
    } finally {
      setIsSaving(false);
    }
  }, [rows]);

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