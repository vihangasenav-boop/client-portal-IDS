"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  LeadSegment,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../bulk-import-utils";

export function useLeadSegments() {
  const [rows, setRows] = useState<LeadSegment[]>([
    emptyRow(createDraftId()),
  ]);

  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  // ==========================================
  // GET PROPERTY
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setPropertyIdLoading(true);

        const response = await fetch(
          "/api/auth/auth-me",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unauthorized");
        }

        const data = await response.json();

        if (cancelled) return;

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          throw new Error(
            "No property selected for this user."
          );
        }

        setPropertyId(
          String(userPropertyId)
        );
      } catch (error) {
        console.error(error);

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

  // ==========================================
  // LOAD LEAD SEGMENTS
  // ==========================================

  useEffect(() => {
    if (
      propertyIdLoading ||
      !propertyId
    ) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(
          "/api/modules/fom/lead-segment",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load lead segments"
          );
        }

        if (cancelled) return;

        const loaded: LeadSegment[] =
          (
            data.leadSegments ?? []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
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
            error instanceof Error
              ? error.message
              : "Could not load lead segments."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdLoading]);

  // ==========================================
  // VALIDATION
  // ==========================================

  const validateRows = (
    dataRows: LeadSegment[]
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
      const code = row.code.trim();
      const name = row.name.trim();

      const rowErrors: RowErrors = {};

      if (!code) {
        rowErrors.code =
          "Code is required";

        isValid = false;
      } else if (code.length > 8) {
        rowErrors.code =
          "Code cannot exceed 8 characters";

        isValid = false;
      } else if (
        codeCounts[
          code.toLowerCase()
        ] > 1
      ) {
        rowErrors.code =
          "Code must be unique";

        isValid = false;
      }

      if (!name) {
        rowErrors.name =
          "Name is required";

        isValid = false;
      } else if (name.length < 2) {
        rowErrors.name =
          "Name must be at least 2 characters";

        isValid = false;
      } else if (
        nameCounts[
          name.toLowerCase()
        ] > 1
      ) {
        rowErrors.name =
          "Name must be unique";

        isValid = false;
      }

      if (
        rowErrors.code ||
        rowErrors.name
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

  // ==========================================
  // SAVE
  // ==========================================

  const save = useCallback(
    async () => {
      if (!propertyId) {
        alert("No property selected.");
        return false;
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

        return false;
      }

      try {
        setIsSaving(true);

        const response = await fetch(
          "/api/modules/fom/lead-segment",
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
                isDefault:
                  row.isDefault,
              })),
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data?.error ||
              "Failed to save lead segments."
          );

          return false;
        }

        const saved: LeadSegment[] =
          (
            data.leadSegments ?? []
          ).map((row: any) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            isDefault:
              row.isDefault,
            selected: false,
          }));

        setRows(saved);
        setErrors({});

        alert(
          "Lead segments saved successfully!"
        );
        return true;
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save lead segments."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [propertyId, rows]
  );

  return {
    rows,
    setRows,

    errors,
    setErrors,

    propertyId,
    propertyIdLoading,

    isLoading,
    isSaving,

    loadError,

    save,
  };
}