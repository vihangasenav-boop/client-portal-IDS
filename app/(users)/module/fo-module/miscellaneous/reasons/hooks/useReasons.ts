"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyReason, Reason, RowErrors } from "../type";

const API_URL = "/api/modules/fom/reasons";

export function useReasons() {
  const [rows, setRows] = useState<Reason[]>([emptyReason(createDraftId())]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadReasons() {
      try {
        const response = await fetch(API_URL, { credentials: "include", cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load reasons.");
        if (cancelled) return;

        const loadedRows: Reason[] = (data.rows ?? []).map(
          (row: Reason) => ({ ...row, selected: false })
        );
        setRows(loadedRows.length ? loadedRows : [emptyReason(createDraftId())]);
      } catch (error) {
        console.error("Load reasons failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load reasons.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadReasons();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof Reason,
    value: string | boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRows((current) => [...current, emptyReason(createDraftId())]);
  };

  const validateRows = (candidateRows: Reason[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    let valid = true;

    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else if (
        candidateRows.some(
          (item) => item.id !== row.id && item.code.trim().toLowerCase() === code
        )
      ) rowErrors.code = "Code must be unique.";

      if (!row.name.trim()) rowErrors.name = "Name is required.";
      else if (
        candidateRows.some(
          (item) => item.id !== row.id && item.name.trim().toLowerCase() === name
        )
      ) rowErrors.name = "Name must be unique.";

      if (!row.departmentModule) {
        rowErrors.departmentModule = "Department module is required.";
      }
      if (!row.operations) {
        rowErrors.operations = "Operation is required.";
      }
      if (Object.keys(rowErrors).length) {
        nextErrors[row.id] = rowErrors;
        valid = false;
      }
    }

    setErrors(nextErrors);
    return valid;
  };

  const save = async () => {
    setLoadError("");
    if (!validateRows(rows)) {
      setLoadError("Fix the highlighted reason rows.");
      return { success: false, message: "Fix the highlighted reason rows." };
    }

    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save reasons.");

      const savedRows: Reason[] = (data.rows ?? []).map(
        (row: Reason) => ({ ...row, selected: false })
      );
      setRows(savedRows.length ? savedRows : [emptyReason(createDraftId())]);
      setErrors({});
      return { success: true, message: data.message || "Reasons saved successfully." };
    } catch (error) {
      console.error("Save reasons failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save reasons.",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteIds = async (ids: number[]) => {
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete reasons.");
      return { success: true, message: data.message || "Reasons deleted." };
    } catch (error) {
      console.error("Delete reasons failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete reasons.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete reasons.");
      setRows([emptyReason(createDraftId())]);
      setErrors({});
      return { success: true, message: "All reasons deleted." };
    } catch (error) {
      console.error("Delete all reasons failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete reasons.",
      };
    }
  };

  return {
    rows,
    setRows,
    errors,
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
