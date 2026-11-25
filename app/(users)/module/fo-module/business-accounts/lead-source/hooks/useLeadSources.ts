"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  LeadSource,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../bulk-import-utils";

export function useLeadSources() {
  const [rows, setRows] = useState<
    LeadSource[]
  >([emptyRow(createDraftId())]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<
      Record<number, RowErrors>
    >({});

  // -----------------------------------------
  // Load Lead Sources
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(
          "/api/modules/fom/lead-source",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load lead sources"
          );
        }

        if (cancelled) return;

        const loaded: LeadSource[] =
          (
            data.leadSources ?? []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            isDefault:
              item.isDefault,
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
              : "Could not load lead sources"
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
  }, []);

  // -----------------------------------------
  // Validation
  // -----------------------------------------

  const validateRows = (
    dataRows: LeadSource[]
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

  // -----------------------------------------
  // Save
  // -----------------------------------------

  const save = useCallback(
    async () => {
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
          "/api/modules/fom/lead-source",
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
              "Failed to save lead sources"
          );

          return false;
        }

        const saved: LeadSource[] =
          (
            data.leadSources ?? []
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
          "Lead sources saved successfully!"
        );
        return true;
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save lead sources."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [rows]
  );

  return {
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