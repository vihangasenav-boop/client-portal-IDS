"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Channel,
  ChannelGroup,
  emptyRow,
  RowErrors,
} from "../type";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";

export function useChannels() {
  const [propertyId, setPropertyId] =
    useState<string | null>(null);

  const [propertyIdLoading, setPropertyIdLoading] =
    useState(true);

  const [rows, setRows] = useState<Channel[]>([
    emptyRow(createDraftId()),
  ]);

  const [groups, setGroups] = useState<
    ChannelGroup[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [errors, setErrors] =
    useState<Record<number, RowErrors>>({});

  // =====================================================
  // GET PROPERTY
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setPropertyIdLoading(true);

        const response = await fetch(
          "/api/auth/auth-me",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unauthorized"
          );
        }

        const id = data?.user?.propertyId;

        if (!id) {
          throw new Error(
            "No property selected for this user."
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

  // =====================================================
  // LOAD CHANNELS + CHANNEL GROUPS
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

        // -----------------------------------------------
        // Load Channel Groups
        // -----------------------------------------------

        const groupResponse = await fetch(
          "/api/modules/fom/channel-group",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const groupData =
          await groupResponse.json();

        if (!groupResponse.ok) {
          throw new Error(
            groupData?.error ||
              "Failed to load channel groups"
          );
        }

        const loadedGroups: ChannelGroup[] =
          (
            groupData.channelGroups ?? []
          ).map((group: any) => ({
            id: group.id,
            code: group.code,
            name: group.name,
          }));

        // -----------------------------------------------
        // Load Channels
        // -----------------------------------------------

        const channelResponse = await fetch(
          "/api/modules/fom/channel",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const channelData =
          await channelResponse.json();

        if (!channelResponse.ok) {
          throw new Error(
            channelData?.error ||
              "Failed to load channels"
          );
        }

        const loadedChannels: Channel[] =
          (
            channelData.channels ?? []
          ).map((item: any) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            channelGroupId:
              item.channelGroupId,
            displaySequence:
              item.displaySequence ?? 0,
            selected: false,
          }));

        if (cancelled) return;

        setGroups(loadedGroups);

        setRows(
          loadedChannels.length > 0
            ? loadedChannels
            : [emptyRow(createDraftId())]
        );
      } catch (error) {
        console.error(
          "Failed to load channel data:",
          error
        );

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load channel data."
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
    dataRows: Channel[]
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

    let isValid = true;

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
    });

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

      if (!row.channelGroupId) {
        rowErrors.channelGroupId =
          "Channel Group is required";
        isValid = false;
      }

      if (
        !Number.isInteger(row.displaySequence) ||
        row.displaySequence < 1
      ) {
        rowErrors.displaySequence =
          "Display sequence must be greater than 0";
        isValid = false;
      }

      if (
        rowErrors.code ||
        rowErrors.name ||
        rowErrors.channelGroupId ||
        rowErrors.displaySequence
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

  // =====================================================
  // SAVE
  // =====================================================

  const save = useCallback(async () => {
    if (!propertyId) {
      alert("No property selected.");
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
        "/api/modules/fom/channel",
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
              channelGroupId:
                row.channelGroupId,
              displaySequence:
                row.displaySequence,
            })),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to save channels."
        );

        return false;
      }

      const saved: Channel[] =
        (
          data.channels ?? []
        ).map((row: any) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          channelGroupId:
            row.channelGroupId,
          displaySequence:
            row.displaySequence ?? 0,
          selected: false,
        }));

      setRows(saved);
      setErrors({});

      alert(
        "Channels saved successfully!"
      );
      return true;
    } catch (error) {
      console.error(error);

      alert(
        "Failed to save channels. Please try again."
      );
      return false;
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

    validateRows,
    save,
  };
}