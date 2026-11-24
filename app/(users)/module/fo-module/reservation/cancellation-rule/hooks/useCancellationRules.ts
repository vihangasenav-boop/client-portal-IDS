"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CancellationRule,
  emptyRow,
  RowErrors,
  CancellationRuleType,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

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
          (
            data.cancellationRules ??
            []
          ).map(
            (item: any) => ({
              id: item.id,
              code: item.code,
              name: item.name,
              type: item.type as CancellationRuleType,
              amount: Number(
                item.amount ?? 0
              ),
              daysBeforeArrival:
                Number(
                  item.daysBeforeArrival ??
                    0
                ),
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
      }

      if (
        row.amount < 0
      ) {
        rowErrors.amount =
          "Amount cannot be negative";
        isValid = false;
      }

      if (
        row.daysBeforeArrival < 0
      ) {
        rowErrors.daysBeforeArrival =
          "Days cannot be negative";
        isValid = false;
      }

      if (
        row.displaySequence < 0
      ) {
        rowErrors.displaySequence =
          "Display sequence cannot be negative";
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
        return;
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

        return;
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
                  type: row.type,
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
          return;
        }

        const saved: CancellationRule[] =
          (
            data.cancellationRules ??
            []
          ).map(
            (row: any) => ({
              id: row.id,
              code: row.code,
              name: row.name,
              type: row.type,
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
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save data. Please try again."
        );
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