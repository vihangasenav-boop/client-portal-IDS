"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyRow, MembershipClass, RowErrors } from "../type";

const API_URL = "/api/modules/fom/membership-class";

export function useMembershipClasses() {
  const [rows, setRows] = useState<MembershipClass[]>([emptyRow(createDraftId())]);
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
        if (!response.ok) throw new Error(data?.error || "Could not load membership classes.");
        if (cancelled) return;
        const loadedRows: MembershipClass[] = (data.rows ?? []).map(
          (row: Omit<MembershipClass, "selected">) => ({ ...row, selected: false })
        );
        setRows(loadedRows.length ? loadedRows : [emptyRow(createDraftId())]);
      } catch (error) {
        console.error("Load membership classes failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load membership classes."
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

  const updateRow = (id: number, field: keyof MembershipClass, value: string | boolean) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const addRow = () => setRows((current) => [...current, emptyRow(createDraftId())]);

  const validateRows = (candidateRows: MembershipClass[]) => {
    const newErrors: Record<number, RowErrors> = {};
    const codes = new Map<string, number>();
    const names = new Map<string, number>();
    for (const row of candidateRows) {
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (code) codes.set(code, (codes.get(code) ?? 0) + 1);
      if (name) names.set(name, (names.get(name) ?? 0) + 1);
    }
    let isValid = true;
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim();
      const name = row.name.trim();
      if (!code) rowErrors.code = "Code is required.";
      else if ((codes.get(code.toLowerCase()) ?? 0) > 1) rowErrors.code = "Code must be unique.";
      if (!name) rowErrors.name = "Name is required.";
      else if ((names.get(name.toLowerCase()) ?? 0) > 1) rowErrors.name = "Name must be unique.";
      if (Object.keys(rowErrors).length) {
        isValid = false;
        newErrors[row.id] = rowErrors;
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
          rows: rows.map(({ id, code, name }) => ({ id, code, name })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save membership classes.");
      const savedRows: MembershipClass[] = (data.rows ?? []).map(
        (row: Omit<MembershipClass, "selected">) => ({ ...row, selected: false })
      );
      setRows(savedRows.length ? savedRows : [emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "Membership classes saved successfully." };
    } catch (error) {
      console.error("Save membership classes failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save membership classes.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete membership classes.");
      return { success: true, message: data.message || "Selected rows deleted." };
    } catch (error) {
      console.error("Delete membership classes failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete membership classes.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete membership classes.");
      setRows([emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "All membership classes deleted." };
    } catch (error) {
      console.error("Delete all membership classes failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete membership classes.",
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
    save,
    deleteIds,
    deleteAll,
  };
}
