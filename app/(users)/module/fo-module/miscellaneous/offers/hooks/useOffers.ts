"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import { emptyOffer, Offer, RowErrors } from "../type";

const API_URL = "/api/modules/fom/offers";

function toInputDate(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function useOffers() {
  const [rows, setRows] = useState<Offer[]>([emptyOffer(createDraftId())]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadOffers() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not load offers.");
        }
        if (cancelled) return;

        const loadedRows: Offer[] = (data.rows ?? []).map(
          (row: {
            id: number;
            code: string;
            name: string;
            description: string;
            startDate: string;
            endDate: string;
          }) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            startDate: toInputDate(row.startDate),
            endDate: toInputDate(row.endDate),
            selected: false,
          })
        );
        setRows(
          loadedRows.length
            ? loadedRows
            : [emptyOffer(createDraftId())]
        );
      } catch (error) {
        console.error("Load offers failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load offers."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadOffers();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof Offer,
    value: string | boolean
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
      emptyOffer(createDraftId()),
    ]);
  };

  const validateRows = (candidateRows: Offer[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    let valid = true;

    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const code = row.code.trim().toLowerCase();
      const name = row.name.trim().toLowerCase();

      if (!row.code.trim()) {
        rowErrors.code = "Code is required.";
      } else if (
        candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.code.trim().toLowerCase() === code
        )
      ) {
        rowErrors.code = "Code must be unique.";
      }

      if (!row.name.trim()) {
        rowErrors.name = "Name is required.";
      } else if (
        candidateRows.some(
          (item) =>
            item.id !== row.id &&
            item.name.trim().toLowerCase() === name
        )
      ) {
        rowErrors.name = "Name must be unique.";
      }

      if (!row.startDate) {
        rowErrors.startDate = "Start date is required.";
      }
      if (!row.endDate) {
        rowErrors.endDate = "End date is required.";
      } else if (
        row.startDate &&
        row.endDate < row.startDate
      ) {
        rowErrors.endDate =
          "End date must be on or after start date.";
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
      setLoadError("Fix the highlighted offer rows.");
      return {
        success: false,
        message: "Fix the highlighted offer rows.",
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
          data?.error || "Could not save offers."
        );
      }

      const savedRows: Offer[] = (data.rows ?? []).map(
        (row: {
          id: number;
          code: string;
          name: string;
          description: string;
          startDate: string;
          endDate: string;
        }) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          startDate: toInputDate(row.startDate),
          endDate: toInputDate(row.endDate),
          selected: false,
        })
      );
      setRows(
        savedRows.length
          ? savedRows
          : [emptyOffer(createDraftId())]
      );
      setErrors({});
      return {
        success: true,
        message:
          data.message || "Offers saved successfully.",
      };
    } catch (error) {
      console.error("Save offers failed:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not save offers.",
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
          data?.error || "Could not delete offers."
        );
      }
      return {
        success: true,
        message: data.message || "Offers deleted.",
      };
    } catch (error) {
      console.error("Delete offers failed:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete offers.",
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
          data?.error || "Could not delete offers."
        );
      }
      setRows([emptyOffer(createDraftId())]);
      setErrors({});
      return {
        success: true,
        message: "All offers deleted.",
      };
    } catch (error) {
      console.error("Delete all offers failed:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete offers.",
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
