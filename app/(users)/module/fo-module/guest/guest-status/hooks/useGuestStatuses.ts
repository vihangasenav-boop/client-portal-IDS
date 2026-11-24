"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyRow, GuestStatus, RowErrors } from "../type";

const API_URL = "/api/modules/fom/guest-status";

export function useGuestStatuses() {
  const [rows, setRows] = useState<GuestStatus[]>([emptyRow(createDraftId())]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not load guest statuses.");
        }
        if (cancelled) return;

        const loadedRows: GuestStatus[] = (data.rows ?? []).map(
          (row: Omit<GuestStatus, "selected">) => ({
            ...row,
            selected: false,
          })
        );
        setRows(loadedRows.length ? loadedRows : [emptyRow(createDraftId())]);
      } catch (error) {
        console.error("Load guest statuses failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load guest statuses."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof GuestStatus,
    value: string | number | boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const addRow = () => {
    setRows((current) => [...current, emptyRow(createDraftId())]);
  };

  const setDefaultRow = (id: number, checked: boolean) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        isDefault: checked ? row.id === id : row.id === id ? false : row.isDefault,
      }))
    );
  };

  const validateRows = (candidateRows: GuestStatus[]) => {
    const newErrors: Record<number, RowErrors> = {};
    const codeCounts = new Map<string, number>();
    const nameCounts = new Map<string, number>();
    for (const row of candidateRows) {
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }

    let isValid = true;
    let defaultCount = 0;
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim();
      const name = row.name.trim();
      if (!code) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(code.toLowerCase()) ?? 0) > 1) rowErrors.code = "Code must be unique.";
      if (!name) rowErrors.name = "Name is required.";
      else if ((nameCounts.get(name.toLowerCase()) ?? 0) > 1) rowErrors.name = "Name must be unique.";
      if (!["VVIP", "VIP", "OTHERS", "HONEYMOON"].includes(row.group)) {
        rowErrors.group = "Select a valid group.";
      }
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence = "Display sequence must be a non-negative whole number.";
      }
      if (row.isDefault) defaultCount += 1;
      if (Object.keys(rowErrors).length) {
        isValid = false;
        newErrors[row.id] = rowErrors;
      }
    }
    if (defaultCount > 1) {
      isValid = false;
      for (const row of candidateRows.filter((item) => item.isDefault)) {
        newErrors[row.id] = {
          ...newErrors[row.id],
          isDefault: "Only one guest status can be the default.",
        };
      }
    }
    return { isValid, errors: newErrors };
  };

  const save = async () => {
    const validation = validateRows(rows);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return { success: false, message: "Please fix the highlighted rows before saving." };
    }

    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map(
            ({ id, code, name, group, displaySequence, isDefault, isActive }) => ({
              id,
              code,
              name,
              group,
              displaySequence,
              isDefault,
              isActive,
            })
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save guest statuses.");

      const savedRows: GuestStatus[] = (data.rows ?? []).map(
        (row: Omit<GuestStatus, "selected">) => ({ ...row, selected: false })
      );
      setRows(savedRows.length ? savedRows : [emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "Guest statuses saved successfully." };
    } catch (error) {
      console.error("Save guest statuses failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save guest statuses.",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteIds = async (ids: number[]) => {
    if (ids.length === 0) return { success: true, message: "Rows removed." };
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete guest statuses.");
      return { success: true, message: data.message || "Selected rows deleted." };
    } catch (error) {
      console.error("Delete guest statuses failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete guest statuses.",
      };
    }
  };

  const deleteAll = async () => {
    try {
      const response = await fetch(`${API_URL}?all=true`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete guest statuses.");
      setRows([emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "All guest statuses deleted." };
    } catch (error) {
      console.error("Delete all guest statuses failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete guest statuses.",
      };
    }
  };

  return {
    rows,
    setRows,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    updateRow,
    addRow,
    setDefaultRow,
    save,
    deleteIds,
    deleteAll,
  };
}
