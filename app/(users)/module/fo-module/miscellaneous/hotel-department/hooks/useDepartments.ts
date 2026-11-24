"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import {
  Department,
  DepartmentModule,
  DesignationOption,
  emptyDepartment,
  RowErrors,
} from "../type";

const API_URL = "/api/modules/fom/hotel-department";

export function useDepartments() {
  const [rows, setRows] = useState<Department[]>([emptyDepartment(createDraftId())]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not load departments.");
        }
        if (cancelled) return;

        setDesignations(data.designations ?? []);
        const loadedRows: Department[] = (data.rows ?? []).map(
          (row: {
            id: number;
            code: string;
            name: string;
            departmentModule: DepartmentModule;
            designationId: number;
            isDefault: boolean;
          }) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            departmentModule: row.departmentModule,
            designationId: row.designationId,
            isDefault: row.isDefault,
            selected: false,
          })
        );
        setRows(loadedRows.length ? loadedRows : [emptyDepartment(createDraftId())]);
      } catch (error) {
        console.error("Load departments failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load departments.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof Department,
    value: string | number | boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { ...emptyDepartment(createDraftId()), designationId: designations[0]?.id ?? 0 },
    ]);
  };

  const validateRows = (candidateRows: Department[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    const codes = new Map<string, number>();
    const names = new Map<string, number>();

    for (const row of candidateRows) {
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (code) codes.set(code, (codes.get(code) ?? 0) + 1);
      if (name) names.set(name, (names.get(name) ?? 0) + 1);
    }

    let valid = true;
    let defaultCount = 0;
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();
      if (!code) rowErrors.code = "Code is required.";
      else if ((codes.get(code) ?? 0) > 1) rowErrors.code = "Code must be unique.";
      if (!name) rowErrors.name = "Name is required.";
      else if ((names.get(name) ?? 0) > 1) rowErrors.name = "Name must be unique.";
      if (!row.departmentModule) rowErrors.departmentModule = "Department module is required.";
      if (!row.designationId || !designations.some((item) => item.id === row.designationId)) {
        rowErrors.designationId = "Designation is required.";
      }
      if (row.isDefault) defaultCount += 1;
      if (Object.keys(rowErrors).length) {
        nextErrors[row.id] = rowErrors;
        valid = false;
      }
    }
    if (defaultCount > 1) valid = false;
    setErrors(nextErrors);
    return valid;
  };

  const save = async () => {
    if (!validateRows(rows)) {
      setLoadError(defaultCountMessage(rows));
      return { success: false, message: "Fix the highlighted department rows." };
    }
    setIsSaving(true);
    setLoadError("");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save departments.");

      const savedRows: Department[] = (data.rows ?? []).map(
        (row: Department & { designationId: number }) => ({
          ...row,
          selected: false,
        })
      );
      setRows(savedRows.length ? savedRows : [emptyDepartment(createDraftId())]);
      setErrors({});
      return { success: true, message: data.message || "Departments saved successfully." };
    } catch (error) {
      console.error("Save departments failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save departments.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete departments.");
      return { success: true, message: data.message || "Departments deleted." };
    } catch (error) {
      console.error("Delete departments failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete departments.",
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
      if (!response.ok) throw new Error(data?.error || "Could not delete departments.");
      setRows([emptyDepartment(createDraftId())]);
      setErrors({});
      return { success: true, message: "All departments deleted." };
    } catch (error) {
      console.error("Delete all departments failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete departments.",
      };
    }
  };

  return {
    rows,
    setRows,
    designations,
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

function defaultCountMessage(rows: Department[]) {
  return rows.filter((row) => row.isDefault).length > 1
    ? "Only one department can be default."
    : "";
}
