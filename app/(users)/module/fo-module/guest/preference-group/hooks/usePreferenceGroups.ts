"use client";

import { useCallback, useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyRow, PreferenceGroup, RowErrors } from "../type";

export function usePreferenceGroups() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyIdLoading, setPropertyIdLoading] = useState(true);
  const [rows, setRows] = useState<PreferenceGroup[]>([
    emptyRow(createDraftId()),
  ]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setPropertyIdLoading(true);
        const response = await fetch("/api/auth/auth-me", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not resolve the current property.");
        }

        const userPropertyId = data?.user?.propertyId;
        if (!userPropertyId) {
          throw new Error("No property is assigned to this user.");
        }

        if (!cancelled) {
          setPropertyId(String(userPropertyId));
        }
      } catch (error) {
        console.error("Resolve preference-group property failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not resolve the current property."
          );
          setIsLoading(false);
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

  useEffect(() => {
    if (propertyIdLoading || !propertyId) return;

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch("/api/modules/fom/preference-group", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not load preference groups.");
        }

        if (cancelled) return;
        const loaded: PreferenceGroup[] = (data.preferenceGroups ?? []).map(
          (row: { id: number; code: string; name: string }) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            selected: false,
          })
        );
        setRows(loaded.length ? loaded : [emptyRow(createDraftId())]);
      } catch (error) {
        console.error("Load preference groups failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load preference groups."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdLoading]);

  const validateRows = (dataRows: PreferenceGroup[]) => {
    const newErrors: Record<number, RowErrors> = {};
    const codeCounts = new Map<string, number>();
    const nameCounts = new Map<string, number>();

    for (const row of dataRows) {
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }

    let isValid = true;
    for (const row of dataRows) {
      const code = row.code.trim();
      const name = row.name.trim();
      const rowErrors: RowErrors = {};

      if (!code) {
        rowErrors.code = "Code is required.";
      } else if (codeCounts.get(code.toLowerCase())! > 1) {
        rowErrors.code = "Code must be unique.";
      }

      if (!name) {
        rowErrors.name = "Name is required.";
      } else if (nameCounts.get(name.toLowerCase())! > 1) {
        rowErrors.name = "Name must be unique.";
      }

      if (Object.keys(rowErrors).length) {
        isValid = false;
        newErrors[row.id] = rowErrors;
      }
    }

    return { isValid, newErrors };
  };

  const save = useCallback(async () => {
    if (!propertyId) {
      alert("No property selected.");
      return;
    }

    const validation = validateRows(rows);
    if (!validation.isValid) {
      setErrors(validation.newErrors);
      alert("Please fix all highlighted errors before saving.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/modules/fom/preference-group", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map(({ id, code, name }) => ({ id, code, name })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || "Could not save preference groups.");
        return;
      }

      const saved: PreferenceGroup[] = (data.preferenceGroups ?? []).map(
        (row: { id: number; code: string; name: string }) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          selected: false,
        })
      );
      setRows(saved.length ? saved : [emptyRow(createDraftId())]);
      setErrors({});
      alert("Preference groups saved successfully.");
    } catch (error) {
      console.error("Save preference groups failed:", error);
      alert(error instanceof Error ? error.message : "Could not save preference groups.");
    } finally {
      setIsSaving(false);
    }
  }, [propertyId, rows]);

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
