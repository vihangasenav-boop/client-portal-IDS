"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  MarketSegment,
  MarketSegmentGroup,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useMarketSegments() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<MarketSegment[]>([
    emptyRow(createDraftId()),
  ]);

  const [groups, setGroups] = useState<
    MarketSegmentGroup[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  /*
  |--------------------------------------------------------------------------
  | Get property
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadProperty() {
      try {
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
            data?.error || "Unauthorized"
          );
        }

        const id = data?.user?.propertyId;

        if (!id) {
          throw new Error(
            "No property selected"
          );
        }

        setPropertyId(String(id));
      } catch (error) {
        console.error(error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to resolve property"
        );
      } finally {
        setPropertyIdLoading(false);
      }
    }

    loadProperty();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load groups + segments
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      propertyIdLoading ||
      !propertyId
    ) {
      return;
    }

    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(
          "/api/modules/fom/market-segment",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load market segments"
          );
        }

        setGroups(
          data.marketSegmentGroups ?? []
        );

        const loaded =
          (
            data.marketSegments ?? []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            marketSegmentGroupId:
              item.marketSegmentGroupId,
            displaySequence:
              item.displaySequence ?? 0,
            selected: false,
          }));

        setRows(
          loaded.length > 0
            ? loaded
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load market segments"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [
    propertyId,
    propertyIdLoading,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateRows = (
    dataRows: MarketSegment[]
  ) => {
    const newErrors: Record<
      number,
      RowErrors
    > = {};

    const codeCounts: Record<
      string,
      number
    > = {};

    let isValid = true;

    dataRows.forEach((row) => {
      const code =
        row.code.trim().toLowerCase();

      if (code) {
        codeCounts[code] =
          (codeCounts[code] || 0) + 1;
      }
    });

    dataRows.forEach((row) => {
      const rowErrors: RowErrors = {};

      if (!row.code.trim()) {
        rowErrors.code =
          "Code is required";
      } else if (
        codeCounts[
          row.code.trim().toLowerCase()
        ] > 1
      ) {
        rowErrors.code =
          "Code must be unique";
      }

      if (!row.name.trim()) {
        rowErrors.name =
          "Name is required";
      }

      if (!row.marketSegmentGroupId) {
        rowErrors.marketSegmentGroupId =
          "Market Segment Group is required";
      }

      if (
        !Number.isInteger(
          row.displaySequence
        ) ||
        row.displaySequence < 0
      ) {
        rowErrors.displaySequence =
          "Invalid display sequence";
      }

      if (
        rowErrors.code ||
        rowErrors.name ||
        rowErrors.marketSegmentGroupId ||
        rowErrors.displaySequence
      ) {
        newErrors[row.id] =
          rowErrors;

        isValid = false;
      }
    });

    return {
      isValid,
      newErrors,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  */

  const save = useCallback(async () => {
    if (!propertyId) {
      alert("No property selected.");
      return;
    }

    const {
      isValid,
      newErrors,
    } = validateRows(rows);

    if (!isValid) {
      setErrors(newErrors);

      alert(
        "Please fix all highlighted errors."
      );

      return;
    }

    try {
      setIsSaving(true);

      const res = await fetch(
        "/api/modules/fom/market-segment",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            rows: rows.map((row) => ({
              id: row.id,
              code: row.code,
              name: row.name,
              marketSegmentGroupId:
                row.marketSegmentGroupId,
              displaySequence:
                row.displaySequence,
            })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
            "Failed to save market segments"
        );

        return;
      }

      const saved =
        (
          data.marketSegments ?? []
        ).map((row: any) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          marketSegmentGroupId:
            row.marketSegmentGroupId,
          displaySequence:
            row.displaySequence ?? 0,
          selected: false,
        }));

      setRows(saved);
      setErrors({});

      alert(
        "Market segments saved successfully!"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to save market segments."
      );
    } finally {
      setIsSaving(false);
    }
  }, [propertyId, rows]);

  return {
    propertyId,
    propertyIdLoading,

    rows,
    setRows,

    groups,

    errors,
    setErrors,

    isLoading,
    isSaving,

    loadError,

    save,
  };
}