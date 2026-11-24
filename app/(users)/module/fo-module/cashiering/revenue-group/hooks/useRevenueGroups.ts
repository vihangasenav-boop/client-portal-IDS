"use client";

import { useCallback, useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import {
  emptyRevenueGroup,
  RevenueGroupErrors,
  RevenueGroupRow,
  RevenueOption,
} from "../type";

type RevenueGroupResponse = {
  rows: Array<Omit<RevenueGroupRow, "revenueIds" | "sacHsn"> & {
    Sac_Hsn: RevenueGroupRow["sacHsn"];
    revenueName: Array<{ id: number }>;
  }>;
  revenues: RevenueOption[];
};

async function fetchRevenueGroups(): Promise<RevenueGroupResponse> {
  const response = await fetch("/api/modules/fom/revenue-group", {
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to load revenue groups.");
  return data;
}

function mapRevenueGroups(data: RevenueGroupResponse): RevenueGroupRow[] {
  return data.rows.map(({ revenueName, Sac_Hsn, ...row }) => ({
    ...row,
    revenueIds: revenueName.map((revenue) => revenue.id),
    sacHsn: Sac_Hsn,
  }));
}

export function useRevenueGroups() {
  const [rows, setRows] = useState<RevenueGroupRow[]>([]);
  const [revenues, setRevenues] = useState<RevenueOption[]>([]);
  const [errors, setErrors] = useState<Record<number, RevenueGroupErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await fetchRevenueGroups();
      setRows(mapRevenueGroups(data));
      setRevenues(data.revenues);
    } catch (error) {
      console.error("Load revenue groups failed:", error);
      setLoadError(error instanceof Error ? error.message : "Could not load revenue groups.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialRows() {
      try {
        const data = await fetchRevenueGroups();
        if (!cancelled) {
          setRows(mapRevenueGroups(data));
          setRevenues(data.revenues);
        }
      } catch (error) {
        console.error("Load revenue groups failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load revenue groups.");
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

  const validateRows = (dataRows: RevenueGroupRow[]) => {
    const newErrors: Record<number, RevenueGroupErrors> = {};
    const codeCounts = new Map<string, number>();
    dataRows.forEach((row) => {
      const code = row.code.trim().toLowerCase();
      if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    });

    let isValid = true;
    dataRows.forEach((row) => {
      const rowErrors: RevenueGroupErrors = {};
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(row.code.trim().toLowerCase()) ?? 0) > 1) {
        rowErrors.code = "Code must be unique.";
      }
      if (!row.name.trim()) rowErrors.name = "Name is required.";
      if (row.revenueIds.length === 0) rowErrors.revenueIds = "Select at least one revenue.";
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
      const response = await fetch("/api/modules/fom/revenue-group", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            ...row,
            Sac_Hsn: row.sacHsn,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to save revenue groups.");
      setRows(mapRevenueGroups(data));
      setErrors({});
      alert("Revenue groups saved successfully.");
    } catch (error) {
      console.error("Save revenue groups failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save revenue groups.");
    } finally {
      setIsSaving(false);
    }
  }, [rows]);

  const addRow = () => {
    setRows((current) => [...current, emptyRevenueGroup(createDraftId())]);
  };

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    if (id > 0) {
      if (!window.confirm(`Delete revenue group "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/revenue-group?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete revenue group.");
      } catch (error) {
        console.error("Delete revenue group failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete revenue group.");
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
    revenues,
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
