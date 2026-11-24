"use client";

import { useCallback, useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyRow, Preference, PreferenceGroupOption, RowErrors } from "../type";

export function usePreferences() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyIdLoading, setPropertyIdLoading] = useState(true);
  const [rows, setRows] = useState<Preference[]>([emptyRow(createDraftId())]);
  const [preferenceGroups, setPreferenceGroups] = useState<PreferenceGroupOption[]>([]);
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

        if (!cancelled) setPropertyId(String(userPropertyId));
      } catch (error) {
        console.error("Resolve preference property failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not resolve the current property."
          );
          setIsLoading(false);
        }
      } finally {
        if (!cancelled) setPropertyIdLoading(false);
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
        const response = await fetch("/api/modules/fom/preference", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not load preferences.");
        }
        if (cancelled) return;

        const loadedGroups: PreferenceGroupOption[] = (
          data.preferenceGroups ?? []
        ).map((group: { id: number; code: string; name: string }) => ({
          id: group.id,
          code: group.code,
          name: group.name,
        }));
        const loadedPreferences: Preference[] = (data.preferences ?? []).map(
          (row: {
            id: number;
            preferenceGroupId: number;
            code: string;
            name: string;
            displaySequence: number;
            isDefault: boolean;
          }) => ({
            id: row.id,
            preferenceGroupId: row.preferenceGroupId,
            code: row.code,
            name: row.name,
            displaySequence: row.displaySequence,
            isDefault: row.isDefault,
            selected: false,
          })
        );

        setPreferenceGroups(loadedGroups);
        setRows(loadedPreferences.length ? loadedPreferences : [emptyRow(createDraftId())]);
      } catch (error) {
        console.error("Load preferences failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load preferences."
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

  const validateRows = (dataRows: Preference[]) => {
    const newErrors: Record<number, RowErrors> = {};
    const codeCounts = new Map<string, number>();
    const nameCounts = new Map<string, number>();
    const defaultGroups = new Set<number>();

    for (const row of dataRows) {
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      const groupKey = row.preferenceGroupId;
      if (code) {
        const key = `${groupKey}:${code}`;
        codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
      }
      if (name) {
        const key = `${groupKey}:${name}`;
        nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
      }
    }

    let isValid = true;
    for (const row of dataRows) {
      const code = row.code.trim();
      const name = row.name.trim();
      const rowErrors: RowErrors = {};
      const codeKey = `${row.preferenceGroupId}:${code.toLowerCase()}`;
      const nameKey = `${row.preferenceGroupId}:${name.toLowerCase()}`;

      if (!row.preferenceGroupId) {
        rowErrors.preferenceGroupId = "Preference group is required.";
      }
      if (!code) {
        rowErrors.code = "Code is required.";
      } else if ((codeCounts.get(codeKey) ?? 0) > 1) {
        rowErrors.code = "Code must be unique within its preference group.";
      }
      if (!name) {
        rowErrors.name = "Name is required.";
      } else if ((nameCounts.get(nameKey) ?? 0) > 1) {
        rowErrors.name = "Name must be unique within its preference group.";
      }
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence = "Display sequence must be a non-negative integer.";
      }
      if (row.isDefault && row.preferenceGroupId) {
        if (defaultGroups.has(row.preferenceGroupId)) {
          rowErrors.isDefault = "Only one preference can be default per group.";
        } else {
          defaultGroups.add(row.preferenceGroupId);
        }
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
      const response = await fetch("/api/modules/fom/preference", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map(
            ({ id, preferenceGroupId, code, name, displaySequence, isDefault }) => ({
              id,
              preferenceGroupId,
              code,
              name,
              displaySequence,
              isDefault,
            })
          ),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || "Could not save preferences.");
        return;
      }

      const saved: Preference[] = (data.preferences ?? []).map(
        (row: {
          id: number;
          preferenceGroupId: number;
          code: string;
          name: string;
          displaySequence: number;
          isDefault: boolean;
        }) => ({
          id: row.id,
          preferenceGroupId: row.preferenceGroupId,
          code: row.code,
          name: row.name,
          displaySequence: row.displaySequence,
          isDefault: row.isDefault,
          selected: false,
        })
      );
      setRows(saved.length ? saved : [emptyRow(createDraftId())]);
      setErrors({});
      alert("Preferences saved successfully.");
    } catch (error) {
      console.error("Save preferences failed:", error);
      alert(error instanceof Error ? error.message : "Could not save preferences.");
    } finally {
      setIsSaving(false);
    }
  }, [propertyId, rows]);

  return {
    propertyId,
    propertyIdLoading,
    rows,
    setRows,
    preferenceGroups,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    save,
  };
}
