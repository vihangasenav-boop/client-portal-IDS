"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BusinessSource,
  BusinessSourceGroup,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useBusinessSources() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [
    propertyIdLoading,
    setPropertyIdLoading,
  ] = useState(true);

  const [rows, setRows] = useState<
    BusinessSource[]
  >([
    emptyRow(createDraftId()),
    emptyRow(createDraftId()),
    emptyRow(createDraftId()),
  ]);

  const [groups, setGroups] =
    useState<BusinessSourceGroup[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  // -----------------------------------------
  // Get Property ID
  // -----------------------------------------

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
              "Unauthorized"
          );
        }

        const userPropertyId =
          data?.user?.propertyId;

        if (!userPropertyId) {
          throw new Error(
            "No property selected for this user."
          );
        }

        if (!cancelled) {
          setPropertyId(
            String(userPropertyId)
          );
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to resolve property."
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

  // -----------------------------------------
  // Load Groups + Business Sources
  // -----------------------------------------

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

        const [
          groupResponse,
          sourceResponse,
        ] = await Promise.all([
          fetch(
            "/api/modules/fom/business-source-group",
            {
              credentials: "include",
              cache: "no-store",
            }
          ),

          fetch(
            "/api/modules/fom/business-source",
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

        const groupData =
          await groupResponse.json();

        const sourceData =
          await sourceResponse.json();

        if (!groupResponse.ok) {
          throw new Error(
            groupData?.error ||
              "Failed to load business source groups"
          );
        }

        if (!sourceResponse.ok) {
          throw new Error(
            sourceData?.error ||
              "Failed to load business sources"
          );
        }

        if (cancelled) return;

        setGroups(
          Array.isArray(
            groupData.businessSourceGroups
          )
            ? groupData.businessSourceGroups
            : []
        );

        const loaded: BusinessSource[] =
          (
            sourceData.businessSources ??
            []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,

            businessSourceGroupId:
              item.businessSourceGroupId,

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

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load business sources."
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

  // -----------------------------------------
  // Validation
  // -----------------------------------------

  const validateRows = (
    dataRows: BusinessSource[]
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
        row.code
          .trim()
          .toLowerCase();

      if (code) {
        codeCounts[code] =
          (codeCounts[code] || 0) + 1;
      }
    });

    dataRows.forEach((row) => {
      const rowErrors: RowErrors = {};

      const code = row.code.trim();
      const name = row.name.trim();

      if (!code) {
        rowErrors.code =
          "Code is required";
      } else if (
        codeCounts[
          code.toLowerCase()
        ] > 1
      ) {
        rowErrors.code =
          "Code must be unique";
      }

      if (!name) {
        rowErrors.name =
          "Name is required";
      }

      if (
        !row.businessSourceGroupId
      ) {
        rowErrors.businessSourceGroupId =
          "Business Source Group is required";
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
        Object.keys(rowErrors).length >
        0
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

  // -----------------------------------------
  // Save
  // -----------------------------------------

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
          "/api/modules/fom/business-source",
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

                businessSourceGroupId:
                  row.businessSourceGroupId,

                displaySequence:
                  row.displaySequence,
              })),
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

        const saved: BusinessSource[] =
          (
            data.businessSources ??
            []
          ).map((row: any) => ({
            id: row.id,
            code: row.code,
            name: row.name,

            businessSourceGroupId:
              row.businessSourceGroupId,

            displaySequence:
              row.displaySequence ?? 0,

            selected: false,
          }));

        setRows(saved);
        setErrors({});

        alert(
          "Business sources saved successfully!"
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

    groups,

    errors,
    setErrors,

    isLoading,
    isSaving,

    loadError,

    validateRows,
    save,
  };
}