"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ReservationType,
  RowErrors,
  emptyRow,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useReservationTypes() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [
    propertyIdLoading,
    setPropertyIdLoading,
  ] = useState(true);

  const [rows, setRows] = useState<
    ReservationType[]
  >([
    emptyRow(createDraftId(), 1),
    emptyRow(createDraftId(), 2),
    emptyRow(createDraftId(), 3),
  ]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] = useState<
    Record<number, RowErrors>
  >({});

  // =====================================================
  // GET PROPERTY
  // =====================================================

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

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Unable to load user"
          );
        }

        if (cancelled) return;

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          setLoadError(
            "No property selected for this user."
          );

          return;
        }

        setPropertyId(
          String(userPropertyId)
        );
      } catch (error) {
        console.error(
          "LOAD PROPERTY ERROR:",
          error
        );

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

  // =====================================================
  // LOAD RESERVATION TYPES
  // =====================================================

  useEffect(() => {
    if (
      propertyIdLoading ||
      !propertyId
    ) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(
          "/api/modules/fom/reservation-type",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load reservation types"
          );
        }

        if (cancelled) return;

        const loaded: ReservationType[] =
          (
            data.reservationTypes ?? []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            group: item.group,
            displaySequence:
              item.displaySequence ?? 0,
            isDefault:
              item.isDefault ?? false,
            selected: false,
          }));

        setRows(
          loaded.length > 0
            ? loaded
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(
          "LOAD RESERVATION TYPES ERROR:",
          error
        );

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load reservation types."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    propertyId,
    propertyIdLoading,
  ]);

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateRows = (
    dataRows: ReservationType[]
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

    const sequenceCounts = new Map<number, number>();

    dataRows.forEach((row) => {
      const code = row.code
        .trim()
        .toLowerCase();

      const name = row.name
        .trim()
        .toLowerCase();

      if (code) {
        codeCounts[code] =
          (codeCounts[code] || 0) + 1;
      }

      if (name) {
        nameCounts[name] =
          (nameCounts[name] || 0) + 1;
      }

      if (Number.isInteger(row.displaySequence)) {
        sequenceCounts.set(
          row.displaySequence,
          (sequenceCounts.get(row.displaySequence) ?? 0) + 1
        );
      }
    });

    let isValid = true;

    dataRows.forEach((row) => {
      const rowErrors: RowErrors = {};

      const code = row.code.trim();
      const name = row.name.trim();

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

      if (!row.group) {
        rowErrors.group =
          "Group is required";

        isValid = false;
      }

      if (
        !Number.isInteger(
          row.displaySequence
        ) ||
        row.displaySequence < 1
      ) {
        rowErrors.displaySequence =
          "Must be greater than 0";

        isValid = false;
      } else if (
        (sequenceCounts.get(row.displaySequence) ?? 0) > 1
      ) {
        rowErrors.displaySequence =
          "Display sequence must be unique";

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

    // Only one default
    const defaultRows =
      dataRows.filter(
        (row) => row.isDefault
      );

    if (defaultRows.length > 1) {
      defaultRows.forEach((row) => {
        if (!newErrors[row.id]) {
          newErrors[row.id] = {};
        }

        newErrors[row.id].name =
          "Only one reservation type can be default.";

        isValid = false;
      });
    }

    return {
      isValid,
      newErrors,
    };
  };

  // =====================================================
  // SAVE
  // =====================================================

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

        const response = await fetch(
          "/api/modules/fom/reservation-type",
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
                  code: row.code.trim(),
                  name: row.name.trim(),
                  group: row.group,
                  displaySequence:
                    row.displaySequence,
                  isDefault:
                    row.isDefault,
                })
              ),
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data?.error ||
              "Failed to save reservation types."
          );

          return false;
        }

        const saved: ReservationType[] =
          (
            data.reservationTypes ??
            []
          ).map((row: any) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            group: row.group,
            displaySequence:
              row.displaySequence ??
              0,
            isDefault:
              row.isDefault ?? false,
            selected: false,
          }));

        setRows(saved);
        setErrors({});

        alert(
          "Reservation types saved successfully!"
        );
        return true;
      } catch (error) {
        console.error(
          "SAVE RESERVATION TYPES ERROR:",
          error
        );

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