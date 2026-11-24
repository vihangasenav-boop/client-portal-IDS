"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { DocumentType, emptyRow, RowErrors } from "../type";

const API_URL = "/api/modules/fom/document-type";

export function useDocumentTypes() {
  const [rows, setRows] = useState<DocumentType[]>([emptyRow(createDraftId())]);
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
          throw new Error(data?.error || "Could not load document types.");
        }

        if (cancelled) return;
        const loadedRows: DocumentType[] = (data.rows ?? []).map(
          (row: Omit<DocumentType, "selected">) => ({
            ...row,
            selected: false,
          })
        );
        setRows(loadedRows.length ? loadedRows : [emptyRow(createDraftId())]);
      } catch (error) {
        console.error("Load document types failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load document types."
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
    field: keyof DocumentType,
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

  const addRow = () => setRows((current) => [...current, emptyRow(createDraftId())]);

  const validateRows = (candidateRows: DocumentType[]) => {
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
    let defaults = 0;
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim();
      const name = row.name.trim();
      if (!code) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(code.toLowerCase()) ?? 0) > 1) {
        rowErrors.code = "Code must be unique.";
      }
      if (!name) rowErrors.name = "Name is required.";
      else if ((nameCounts.get(name.toLowerCase()) ?? 0) > 1) {
        rowErrors.name = "Name must be unique.";
      }
      if (row.isDefault) defaults += 1;
      if (Object.keys(rowErrors).length) {
        isValid = false;
        newErrors[row.id] = rowErrors;
      }
    }

    if (defaults > 1) {
      isValid = false;
      const defaultRows = candidateRows.filter((row) => row.isDefault);
      for (const row of defaultRows) {
        newErrors[row.id] = {
          ...newErrors[row.id],
          isDefault: "Only one document type can be the default.",
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
          rows: rows.map(({ id, code, name, isDefault, isActive }) => ({
            id,
            code,
            name,
            isDefault,
            isActive,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save document types.");

      const savedRows: DocumentType[] = (data.rows ?? []).map(
        (row: Omit<DocumentType, "selected">) => ({ ...row, selected: false })
      );
      setRows(savedRows.length ? savedRows : [emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "Document types saved successfully." };
    } catch (error) {
      console.error("Save document types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save document types.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete document types.");
      return { success: true, message: data.message || "Selected rows deleted." };
    } catch (error) {
      console.error("Delete document types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete document types.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete document types.");
      setRows([emptyRow(createDraftId())]);
      setErrors({});
      return { success: true, message: "All document types deleted." };
    } catch (error) {
      console.error("Delete all document types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete document types.",
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
