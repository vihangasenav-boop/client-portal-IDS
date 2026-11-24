"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { Designation, DesignationType, emptyRow, RowErrors } from "../type";

const API_URL = "/api/modules/fom/designation";

export function useDesignations() {
  const [rows, setRows] = useState<Designation[]>([emptyRow(createDraftId())]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDesignations() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not load designations.");
        }

        if (cancelled) return;
        const loadedRows: Designation[] = (data.rows ?? []).map(
          (row: {
            id: number;
            code: string;
            name: string;
            Type: DesignationType;
          }) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            type: row.Type,
            selected: false,
          })
        );
        setRows(loadedRows.length ? loadedRows : [emptyRow(createDraftId())]);
        setErrors({});
      } catch (error) {
        console.error("Load designations failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load designations."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDesignations();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof Designation,
    value: string | boolean
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

  const validateRows = (candidateRows: Designation[]) => {
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
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim();
      const name = row.name.trim();

      if (!code) {
        rowErrors.code = "Code is required.";
      } else if ((codeCounts.get(code.toLowerCase()) ?? 0) > 1) {
        rowErrors.code = "Code must be unique.";
      }
      if (!name) {
        rowErrors.name = "Name is required.";
      } else if ((nameCounts.get(name.toLowerCase()) ?? 0) > 1) {
        rowErrors.name = "Name must be unique.";
      }
      if (row.type !== "Hotel" && row.type !== "Guest") {
        rowErrors.type = "Select Hotel or Guest.";
      }

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
    setLoadError("");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map(({ id, code, name, type }) => ({
            id,
            code,
            name,
            type,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not save designations.");
      }

      const savedRows: Designation[] = (data.rows ?? []).map(
        (row: { id: number; code: string; name: string; Type: DesignationType }) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          type: row.Type,
          selected: false,
        })
      );
      setRows(savedRows.length ? savedRows : [emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "Designations saved successfully." };
    } catch (error) {
      console.error("Save designations failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save designations.",
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
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete designations.");
      }
      return { success: true, message: data.message || "Selected rows deleted." };
    } catch (error) {
      console.error("Delete designations failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete designations.",
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
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete designations.");
      }
      setRows([emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "All designations deleted." };
    } catch (error) {
      console.error("Delete all designations failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete designations.",
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
    validateRows,
    save,
    deleteIds,
    deleteAll,
  };
}
