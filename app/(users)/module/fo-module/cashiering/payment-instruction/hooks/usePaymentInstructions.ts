"use client";

import { useCallback, useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import {
  emptyPaymentInstruction,
  PaymentInstructionErrors,
  PaymentInstructionRow,
  RelationOption,
} from "../type";

type ApiRow = Omit<PaymentInstructionRow, "revenueGroupIds" | "revenueIds" | "transactionLimit"> & {
  revenueGroups: Array<{ id: number }>;
  revenueName: Array<{ id: number }>;
  transactionLimit: string | number | null;
};

type ApiResponse = {
  rows: ApiRow[];
  revenueGroups: RelationOption[];
  revenues: RelationOption[];
};

async function fetchPaymentInstructions(): Promise<ApiResponse> {
  const response = await fetch("/api/modules/fom/payment-instruction", {
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to load payment instructions.");
  return data;
}

function mapApiRows(rows: ApiRow[]): PaymentInstructionRow[] {
  return rows.map(({ revenueGroups, revenueName, transactionLimit, ...row }) => ({
    ...row,
    revenueGroupIds: revenueGroups.map((group) => group.id),
    revenueIds: revenueName.map((revenue) => revenue.id),
    transactionLimit: transactionLimit === null ? "" : String(transactionLimit),
  }));
}

export function usePaymentInstructions() {
  const [rows, setRows] = useState<PaymentInstructionRow[]>([]);
  const [revenueGroups, setRevenueGroups] = useState<RelationOption[]>([]);
  const [revenues, setRevenues] = useState<RelationOption[]>([]);
  const [errors, setErrors] = useState<Record<number, PaymentInstructionErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await fetchPaymentInstructions();
      setRows(mapApiRows(data.rows));
      setRevenueGroups(data.revenueGroups);
      setRevenues(data.revenues);
    } catch (error) {
      console.error("Load payment instructions failed:", error);
      setLoadError(error instanceof Error ? error.message : "Could not load payment instructions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialRows() {
      try {
        const data = await fetchPaymentInstructions();
        if (!cancelled) {
          setRows(mapApiRows(data.rows));
          setRevenueGroups(data.revenueGroups);
          setRevenues(data.revenues);
        }
      } catch (error) {
        console.error("Load payment instructions failed:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load payment instructions.");
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

  const validateRows = (dataRows: PaymentInstructionRow[]) => {
    const newErrors: Record<number, PaymentInstructionErrors> = {};
    const codeCounts = new Map<string, number>();
    dataRows.forEach((row) => {
      const code = row.code.trim().toLowerCase();
      if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    });

    let isValid = true;
    dataRows.forEach((row) => {
      const rowErrors: PaymentInstructionErrors = {};
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(row.code.trim().toLowerCase()) ?? 0) > 1) {
        rowErrors.code = "Code must be unique.";
      }
      if (!row.name.trim()) rowErrors.name = "Name is required.";
      if (!row.nameMultilingual.trim()) {
        rowErrors.nameMultilingual = "Multilingual name is required.";
      }
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence = "Sequence must be a non-negative whole number.";
      }
      if (!Number.isInteger(row.split) || row.split < 0) {
        rowErrors.split = "Split must be a non-negative whole number.";
      }
      if (row.transactionLimit) {
        const limit = Number(row.transactionLimit);
        if (
          !/^\d+(\.\d{1,2})?$/.test(row.transactionLimit.trim()) ||
          !Number.isFinite(limit) ||
          limit > 99_999_999.99
        ) {
          rowErrors.transactionLimit = "Enter a valid amount with up to two decimal places.";
        }
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
      const response = await fetch("/api/modules/fom/payment-instruction", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            ...row,
            transactionLimit: row.transactionLimit.trim() || null,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to save payment instructions.");
      setRows(mapApiRows(data.rows));
      setRevenueGroups(data.revenueGroups);
      setRevenues(data.revenues);
      setErrors({});
      alert("Payment instructions saved successfully.");
    } catch (error) {
      console.error("Save payment instructions failed:", error);
      alert(error instanceof Error ? error.message : "Failed to save payment instructions.");
    } finally {
      setIsSaving(false);
    }
  }, [rows]);

  const addRow = () => {
    setRows((current) => [...current, emptyPaymentInstruction(createDraftId())]);
  };

  const removeRow = async (id: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    if (id > 0) {
      if (!window.confirm(`Delete payment instruction "${row.name || row.code}"?`)) return;
      try {
        const response = await fetch(`/api/modules/fom/payment-instruction?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not delete payment instruction.");
      } catch (error) {
        console.error("Delete payment instruction failed:", error);
        alert(error instanceof Error ? error.message : "Could not delete payment instruction.");
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
    revenueGroups,
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
