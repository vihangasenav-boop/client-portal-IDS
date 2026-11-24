"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RoomFeature,
  RowErrors,
  emptyRow,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useRoomFeatures() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<RoomFeature[]>([
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

  // ========================================
  // GET PROPERTY
  // ========================================

  useEffect(() => {
    async function loadProperty() {
      try {
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

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          throw new Error(
            "No property selected"
          );
        }

        setPropertyId(
          String(userPropertyId)
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to resolve property"
        );
      } finally {
        setPropertyIdLoading(false);
      }
    }

    loadProperty();
  }, []);

  // ========================================
  // LOAD ROOM FEATURES
  // ========================================

  useEffect(() => {
    if (propertyIdLoading || !propertyId) {
      return;
    }

    async function load() {
      try {
        setIsLoading(true);

        const res = await fetch(
          "/api/modules/fom/room-feature",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load room features"
          );
        }

        const loaded: RoomFeature[] =
          (data.roomFeatures ?? []).map(
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
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load room features"
        );
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [propertyId, propertyIdLoading]);

  // ========================================
  // VALIDATION
  // ========================================

  const validateRows = (
    dataRows: RoomFeature[]
  ) => {
    const newErrors:
      Record<number, RowErrors> = {};

    const codeSet = new Set<string>();
    let isValid = true;

    dataRows.forEach((row) => {
      const rowErrors: RowErrors = {};

      const code = row.code.trim();
      const name = row.name.trim();

      if (!code) {
        rowErrors.code = "Code is required";
        isValid = false;
      } else {
        const normalized =
          code.toLowerCase();

        if (codeSet.has(normalized)) {
          rowErrors.code =
            "Code must be unique";
          isValid = false;
        }

        codeSet.add(normalized);
      }

      if (!name) {
        rowErrors.name = "Name is required";
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

  // ========================================
  // SAVE
  // ========================================

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
        "/api/modules/fom/room-feature",
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
            "Failed to save room features"
        );
      }

      const saved: RoomFeature[] =
        (data.roomFeatures ?? []).map(
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

      alert(
        "Room features saved successfully!"
      );
    } catch (error) {
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
    propertyId,
    propertyIdLoading,
    rows,
    setRows,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    save,
  };
}