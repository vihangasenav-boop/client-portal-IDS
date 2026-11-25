"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CancellationRule,
  CANCELLATION_RULE_TYPES,
  emptyRow,
  RowErrors,
  CancellationRuleType,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

type CancellationRuleApiRow = {
  id: number;
  code: string;
  name: string;
  type: string | null;
  amount: number | string | null;
  daysBeforeArrival: number | null;
  displaySequence: number | null;
  cancelBeforeTime: string | null;
};

export function useCancellationRules() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<
    CancellationRule[]
  >([emptyRow(createDraftId())]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  // =========================================
  // Get property
  // =========================================

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setPropertyIdLoading(true);

        const res = await fetch(
          "/api/auth/auth-me",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(
            "Unauthorized"
          );
        }

        const data = await res.json();

        if (cancelled) return;

        const id =
          data?.user?.propertyId;

        if (!id) {
          setLoadError(
            "No property selected for this user."
          );
          return;
        }

        setPropertyId(String(id));
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            "Unable to resolve property selection."
          );
        }
      } finally {
        if (!cancelled) {
          setPropertyIdLoading(false);
        }
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================
  // Load cancellation rules
  // =========================================

  useEffect(() => {
    if (
      propertyIdLoading ||
      !propertyId
    ) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(
          "/api/modules/fom/cancellation-rule",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load cancellation rules"
          );
        }

        if (cancelled) return;

        const loaded: CancellationRule[] =
          ((data.cancellationRules ?? []) as CancellationRuleApiRow[]).map(
            (item) => ({
              id: item.id,
              code: item.code,
              name: item.name,
              type: (item.type ?? "") as CancellationRuleType,
              amount: item.amount == null ? null : Number(item.amount),
              daysBeforeArrival:
                item.daysBeforeArrival == null
                  ? null
                  : Number(item.daysBeforeArrival),
              displaySequence:
                Number(
                  item.displaySequence ??
                    0
                ),
              cancelBeforeTime:
                item.cancelBeforeTime ??
                "",
              selected: false,
            })
          );

        setRows(
          loaded.length > 0
            ? loaded
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            "Could not load existing cancellation rules."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    propertyId,
    propertyIdLoading,
  ]);

  // =========================================
  // Validation
  // =========================================

  const validateRows = (
    dataRows: CancellationRule[]
  ) => {
    const newErrors: Record<
      number,
      RowErrors
    > = {};

    const codeCounts: Record<
      string,
      number
    > = {};

    const nameCounts: Record<
      string,
      number
    > = {};
    const sequenceCounts: Record<number, number> = {};

    dataRows.forEach((row) => {
      const code =
        row.code
          .trim()
          .toLowerCase();

      const name =
        row.name
          .trim()
          .toLowerCase();

      if (code) {
        codeCounts[code] =
          (codeCounts[code] || 0) +
          1;
      }

      if (name) {
        nameCounts[name] =
          (nameCounts[name] || 0) +
          1;
      }

      if (Number.isInteger(row.displaySequence) && row.displaySequence > 0) {
        sequenceCounts[row.displaySequence] =
          (sequenceCounts[row.displaySequence] || 0) + 1;
      }
    });

    let isValid = true;

    dataRows.forEach((row) => {
      const rowErrors: RowErrors =
        {};

      const code =
        row.code.trim();

      const name =
        row.name.trim();

      if (!code) {
        rowErrors.code =
          "Code is required";
        isValid = false;
      } else if (code.length > 8) {
        rowErrors.code =
          "Code cannot exceed 8 characters";
        isValid = false;
      } else if (
        codeCounts[
          code.toLowerCase()
        ] > 1
      ) {
        rowErrors.code =
          "Code must be unique";
        isValid = false;
      }

      if (!name) {
        rowErrors.name =
          "Name is required";
        isValid = false;
      } else if (name.length < 2) {
        rowErrors.name =
          "Name must be at least 2 characters";
        isValid = false;
      } else if (
        nameCounts[
          name.toLowerCase()
        ] > 1
      ) {
        rowErrors.name =
          "Name must be unique";
        isValid = false;
      }

      if (!row.type) {
        rowErrors.type =
          "Type is required";
        isValid = false;
      } else if (!CANCELLATION_RULE_TYPES.includes(row.type)) {
        rowErrors.type =
          "Select a valid cancellation rule type";
        isValid = false;
      }

      if (
        row.amount === null ||
        !Number.isFinite(row.amount) ||
        row.amount < 0 ||
        row.amount > 100
      ) {
        rowErrors.amount =
          "Amount must be between 0 and 100 percent";
        isValid = false;
      }

      if (
        row.daysBeforeArrival === null ||
        !Number.isInteger(row.daysBeforeArrival) ||
        row.daysBeforeArrival < 0
      ) {
        rowErrors.daysBeforeArrival =
          "Days Before Arrival is required and must be a non-negative integer";
        isValid = false;
      }

      if (
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 1
      ) {
        rowErrors.displaySequence =
          "Display sequence must be a positive integer";
        isValid = false;
      } else if (sequenceCounts[row.displaySequence] > 1) {
        rowErrors.displaySequence =
          "Display sequence must be unique";
        isValid = false;
      }

      if (!row.cancelBeforeTime.trim()) {
        rowErrors.cancelBeforeTime =
          "Cancel Before Time is required";
        isValid = false;
      } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.cancelBeforeTime)) {
        rowErrors.cancelBeforeTime =
          "Cancel Before Time must be a valid time";
        isValid = false;
      }

      if (
        Object.keys(rowErrors)
          .length > 0
      ) {
        newErrors[row.id] =
          rowErrors;
      }
    });

    return {
      isValid,
      newErrors,
    };
  };

  // =========================================
  // Save
  // =========================================

  const save = useCallback(
    async () => {
      if (!propertyId) {
        alert(
          "No property selected."
        );
        return false;
      }

      const {
        isValid,
        newErrors,
      } = validateRows(rows);

      if (!isValid) {
        setErrors(newErrors);

        alert(
          "Please fix all highlighted errors before saving."
        );

        return false;
      }

      try {
        setIsSaving(true);

        const res = await fetch(
          "/api/modules/fom/cancellation-rule",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              rows: rows.map(
                (row) => ({
                  id: row.id,
                  code: row.code,
                  name: row.name,
                  type: (row.type ?? "") as CancellationRuleType,
                  amount: row.amount,
                  daysBeforeArrival:
                    row.daysBeforeArrival,
                  displaySequence:
                    row.displaySequence,
                  cancelBeforeTime:
                    row.cancelBeforeTime ||
                    null,
                })
              ),
            }),
          }
        );

        const data =
          await res.json();

        if (!res.ok) {
          alert(
            data?.error ||
              "Failed to save data."
          );
          return false;
        }

        const saved: CancellationRule[] =
          ((data.cancellationRules ?? []) as CancellationRuleApiRow[]).map(
            (row) => ({
              id: row.id,
              code: row.code,
              name: row.name,
              type: (row.type ?? "") as CancellationRuleType,
              amount: Number(
                row.amount ?? 0
              ),
              daysBeforeArrival:
                Number(
                  row.daysBeforeArrival ??
                    0
                ),
              displaySequence:
                Number(
                  row.displaySequence ??
                    0
                ),
              cancelBeforeTime:
                row.cancelBeforeTime ??
                "",
              selected: false,
            })
          );

        setRows(saved);
        setErrors({});

        alert(
          "Cancellation rules saved successfully!"
        );
        return true;
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save data. Please try again."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [propertyId, rows]
  );

  return {
    propertyId,
    propertyIdLoading,

    rows,
    setRows,

    errors,
    setErrors,

    isLoading,
    isSaving,

    loadError,

    validateRows,
    save,
  };
}