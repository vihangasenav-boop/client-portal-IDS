"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { DepartmentOption, emptySection, RowErrors, Section } from "../type";

const API_URL = "/api/modules/fom/section";

export function useSections() {
  const [rows, setRows] = useState<Section[]>([emptySection(createDraftId())]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not load sections.");
        }
        if (cancelled) return;

        setDepartments(data.departments ?? []);
        const loadedRows: Section[] = (data.rows ?? []).map(
          (row: {
            id: number;
            departmentId: number;
            code: string;
            name: string;
            isDefault: boolean;
          }) => ({
            id: row.id,
            departmentId: row.departmentId,
            code: row.code,
            name: row.name,
            isDefault: row.isDefault,
            selected: false,
          })
        );
        setRows(loadedRows.length ? loadedRows : [emptySection(createDraftId())]);
      } catch (error) {
        console.error("Load sections failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load sections.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSections();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof Section,
    value: string | number | boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { ...emptySection(createDraftId()), departmentId: departments[0]?.id ?? 0 },
    ]);
  };

  const validateRows = (candidateRows: Section[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    let valid = true;

    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();

      if (!row.departmentId || !departments.some((item) => item.id === row.departmentId)) {
        rowErrors.departmentId = "Department is required.";
      }
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else {
        const duplicateCode = candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.departmentId === row.departmentId &&
            item.code.trim().toLowerCase() === code
        );
        if (duplicateCode) rowErrors.code = "Code must be unique within the department.";
      }
      if (!row.name.trim()) rowErrors.name = "Name is required.";
      else {
        const duplicateName = candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.departmentId === row.departmentId &&
            item.name.trim().toLowerCase() === name
        );
        if (duplicateName) rowErrors.name = "Name must be unique within the department.";
      }
      if (Object.keys(rowErrors).length) {
        nextErrors[row.id] = rowErrors;
        valid = false;
      }
    }

    for (const department of departments) {
      const defaults = candidateRows.filter(
        (row) => row.departmentId === department.id && row.isDefault
      );
      if (defaults.length > 1) {
        for (const row of defaults) {
          nextErrors[row.id] = {
            ...nextErrors[row.id],
          };
        }
        valid = false;
        setLoadError("Only one section can be default per department.");
      }
    }

    setErrors(nextErrors);
    return valid;
  };

  const save = async () => {
    setLoadError("");
    if (!validateRows(rows)) {
      if (!loadError) setLoadError("Fix the highlighted section rows.");
      return { success: false, message: "Fix the highlighted section rows." };
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
      if (!response.ok) throw new Error(data?.error || "Could not save sections.");

      const savedRows: Section[] = (data.rows ?? []).map(
        (row: Section) => ({ ...row, selected: false })
      );
      setRows(savedRows.length ? savedRows : [emptySection(createDraftId())]);
      setErrors({});
      return { success: true, message: data.message || "Sections saved successfully." };
    } catch (error) {
      console.error("Save sections failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save sections.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete sections.");
      return { success: true, message: data.message || "Sections deleted." };
    } catch (error) {
      console.error("Delete sections failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete sections.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete sections.");
      setRows([emptySection(createDraftId())]);
      setErrors({});
      return { success: true, message: "All sections deleted." };
    } catch (error) {
      console.error("Delete all sections failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete sections.",
      };
    }
  };

  return {
    rows,
    setRows,
    departments,
    errors,
    isLoading,
    isSaving,
    loadError,
    setLoadError,
    updateRow,
    addRow,
    save,
    deleteIds,
    deleteAll,
  };
}
