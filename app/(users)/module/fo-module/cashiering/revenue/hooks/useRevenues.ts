"use client";

import { useCallback, useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyRevenue, Revenue, RevenueRowErrors } from "../type";

async function fetchRevenues(): Promise<Revenue[]> {
  const response = await fetch("/api/modules/fom/revenue", {
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to load revenue.");
  return (data.rows ?? []).map((row: Revenue) => ({ ...row }));
}

export function useRevenues() {
  const [rows, setRows] = useState<Revenue[]>([]);
  const [errors, setErrors] = useState<Record<number, RevenueRowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setRows(await fetchRevenues());
    } catch (error) {
      console.error("Load revenue failed:", error);
      setLoadError(error instanceof Error ? error.message : "Could not load revenue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialRows() {
      try {
        const loaded = await fetchRevenues();
        if (!cancelled) setRows(loaded);
      } catch (error) {
        console.error("Load revenue failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load revenue.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateRows = (dataRows: Revenue[]) => {
    const newErrors: Record<number, RevenueRowErrors> = {};
    const codeCounts = new Map<string, number>();

    dataRows.forEach((row) => {
      const code = row.code.trim().toLowerCase();
      if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    });

    let isValid = true;
    dataRows.forEach((row) => {
      const rowErrors: RevenueRowErrors = {};
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(row.code.trim().toLowerCase()) ?? 0) > 1) {
        rowErrors.code = "Code must be unique.";
      }
      if (!row.name.trim()) rowErrors.name = "Name is required.";
      if (!row.sacHsnNumber.trim()) {
        rowErrors.sacHsnNumber = `${row.sacHsn} number is required.`;
      }
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence = "Sequence must be a non-negative whole number.";
      }
      if (Object.keys(rowErrors).length > 0) {
        newErrors[row.id] = rowErrors;
        isValid = false;
      }
    });

    return { isValid, newErrors };
  };

  const save = useCallback(async () => {
    const { isValid, newErrors } = validateRows(rows);
    if (!isValid) {
      setErrors(newErrors);
      alert("Please fix all highlighted errors before saving.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/modules/fom/revenue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to save revenue.");
      setRows(data.rows);
      setErrors({});
      alert("Revenue saved successfully.");
    } catch (error) {
      console.error("Save revenue failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save revenue.");
    } finally {
      setIsSaving(false);
    }
  }, [rows]);

  const addRow = () => setRows((current) => [...current, emptyRevenue(createDraftId())]);

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (id > 0) {
      if (!window.confirm(`Delete revenue "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/revenue?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete revenue.");
      } catch (error) {
        console.error("Delete revenue failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete revenue.");
        return;
      }
    }

    setRows((current) => current.filter((item) => item.id !== id));
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return {
    rows,
    setRows,
    errors,
    isLoading,
    isSaving,
    loadError,
    load,
    save,
    addRow,
    removeRow,
  };
}
