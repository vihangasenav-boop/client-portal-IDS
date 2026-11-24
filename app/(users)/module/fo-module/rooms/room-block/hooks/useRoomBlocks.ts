"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RoomBlock,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useRoomBlocks() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [
    propertyIdLoading,
    setPropertyIdLoading,
  ] = useState(true);

  const [rows, setRows] =
    useState<RoomBlock[]>([
      emptyRow(createDraftId()),
    ]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<
      Record<number, RowErrors>
    >({});

  // --------------------------------
  // Load property
  // --------------------------------

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

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Unauthorized"
          );
        }

        const id =
          data?.user?.propertyId;

        if (!id) {
          throw new Error(
            "No property selected"
          );
        }

        if (!cancelled) {
          setPropertyId(String(id));
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to resolve property"
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

  // --------------------------------
  // Load room blocks
  // --------------------------------

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
          "/api/modules/fom/room-block",
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
              "Failed to load room blocks"
          );
        }

        if (cancelled) return;

        const loaded: RoomBlock[] =
          (
            data.roomBlocks ?? []
          ).map((item: any) => ({
            id: item.id,
            blockCode:
              item.blockCode,
            blockName:
              item.blockName,
            isDefault:
              item.isDefault,
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
              : "Could not load room blocks"
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

  // --------------------------------
  // Validation
  // --------------------------------

  const validateRows = (
    dataRows: RoomBlock[]
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
        row.blockCode
          .trim()
          .toLowerCase();

      const name =
        row.blockName
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
      const code =
        row.blockCode.trim();

      const name =
        row.blockName.trim();

      const rowErrors: RowErrors =
        {};

      if (!code) {
        rowErrors.blockCode =
          "Block Code is required";

        isValid = false;
      } else if (
        codeCounts[
          code.toLowerCase()
        ] > 1
      ) {
        rowErrors.blockCode =
          "Block Code must be unique";

        isValid = false;
      }

      if (!name) {
        rowErrors.blockName =
          "Block Name is required";

        isValid = false;
      } else if (
        nameCounts[
          name.toLowerCase()
        ] > 1
      ) {
        rowErrors.blockName =
          "Block Name must be unique";

        isValid = false;
      }

      if (
        rowErrors.blockCode ||
        rowErrors.blockName
      ) {
        newErrors[row.id] =
          rowErrors;
      }
    });

    const defaultCount =
      dataRows.filter(
        (row) => row.isDefault
      ).length;

    if (defaultCount > 1) {
      isValid = false;

      dataRows.forEach((row) => {
        if (row.isDefault) {
          newErrors[row.id] = {
            ...newErrors[row.id],
            blockName:
              "Only one Room Block can be default",
          };
        }
      });
    }

    return {
      isValid,
      newErrors,
    };
  };

  // --------------------------------
  // Save
  // --------------------------------

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
          "/api/modules/fom/room-block",
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
                  blockCode:
                    row.blockCode,
                  blockName:
                    row.blockName,
                  isDefault:
                    row.isDefault,
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
              "Failed to save room blocks."
          );

          return;
        }

        const saved: RoomBlock[] =
          (
            data.roomBlocks ?? []
          ).map((row: any) => ({
            id: row.id,
            blockCode:
              row.blockCode,
            blockName:
              row.blockName,
            isDefault:
              row.isDefault,
            selected: false,
          }));

        setRows(saved);
        setErrors({});

        alert(
          "Room blocks saved successfully!"
        );
      } catch (error) {
        console.error(error);

        alert(
          "Failed to save room blocks. Please try again."
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