"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import {
  DepartmentOption,
  emptyTraceDefinition,
  RowErrors,
  TraceDefinition,
} from "../type";

const API_URL = "/api/modules/fom/trace-definition";

export function useTraceDefinitions() {
  const [rows, setRows] = useState<TraceDefinition[]>([
    emptyTraceDefinition(createDraftId()),
  ]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not load trace definitions.");
        }
        if (cancelled) return;

        setDepartments(data.departments ?? []);
        const loadedRows: TraceDefinition[] = (data.rows ?? []).map(
          (row: TraceDefinition) => ({ ...row, selected: false })
        );
        setRows(
          loadedRows.length
            ? loadedRows
            : [emptyTraceDefinition(createDraftId())]
        );
      } catch (error) {
        console.error("Load trace definitions failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load trace definitions."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof TraceDefinition,
    value: string | number | boolean
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        ...emptyTraceDefinition(createDraftId()),
        departmentId: departments[0]?.id ?? 0,
      },
    ]);
  };

  const validateRows = (candidateRows: TraceDefinition[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    let valid = true;

    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();

      if (
        !row.departmentId ||
        !departments.some((item) => item.id === row.departmentId)
      ) {
        rowErrors.departmentId = "Department is required.";
      }
      if (!row.code.trim()) {
        rowErrors.code = "Code is required.";
      } else if (
        candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.departmentId === row.departmentId &&
            item.code.trim().toLowerCase() === code
        )
      ) {
        rowErrors.code =
          "Code must be unique within the department.";
      }
      if (!row.name.trim()) {
        rowErrors.name = "Name is required.";
      } else if (
        candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.departmentId === row.departmentId &&
            item.name.trim().toLowerCase() === name
        )
      ) {
        rowErrors.name =
          "Name must be unique within the department.";
      }
      if (Object.keys(rowErrors).length) {
        nextErrors[row.id] = rowErrors;
        valid = false;
      }
    }

    for (const department of departments) {
      const defaults = candidateRows.filter(
        (row) =>
          row.departmentId === department.id && row.isDefault
      );
      if (defaults.length > 1) {
        valid = false;
        setLoadError(
          "Only one trace definition can be default per department."
        );
      }
    }

    setErrors(nextErrors);
    return valid;
  };

  const save = async () => {
    setLoadError("");
    if (!validateRows(rows)) {
      if (!loadError) {
        setLoadError(
          "Fix the highlighted trace definition rows."
        );
      }
      return {
        success: false,
        message: "Fix the highlighted trace definition rows.",
      };
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
      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not save trace definitions."
        );
      }

      const savedRows: TraceDefinition[] = (
        data.rows ?? []
      ).map((row: TraceDefinition) => ({
        ...row,
        selected: false,
      }));
      setRows(
        savedRows.length
          ? savedRows
          : [emptyTraceDefinition(createDraftId())]
      );
      setErrors({});
      return {
        success: true,
        message:
          data.message ||
          "Trace definitions saved successfully.",
      };
    } catch (error) {
      console.error(
        "Save trace definitions failed:",
        error
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not save trace definitions.",
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
      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not delete trace definitions."
        );
      }
      return {
        success: true,
        message:
          data.message || "Trace definitions deleted.",
      };
    } catch (error) {
      console.error(
        "Delete trace definitions failed:",
        error
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete trace definitions.",
      };
    }
  };

  const deleteAll = async () => {
    try {
      const response = await fetch(
        `${API_URL}?all=true`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not delete trace definitions."
        );
      }
      setRows([
        emptyTraceDefinition(createDraftId()),
      ]);
      setErrors({});
      return {
        success: true,
        message: "All trace definitions deleted.",
      };
    } catch (error) {
      console.error(
        "Delete all trace definitions failed:",
        error
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete trace definitions.",
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
    updateRow,
    addRow,
    save,
    deleteIds,
    deleteAll,
  };
}
