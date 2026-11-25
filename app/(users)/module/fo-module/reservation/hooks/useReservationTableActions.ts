"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type SelectableRow = {
  id: number;
  selected: boolean;
};

export function useReservationTableLock<T extends { id: number }>(
  isLoading: boolean,
  rows: T[],
  save: () => Promise<boolean>
) {
  const [isLocked, setIsLocked] = useState(false);
  const initialLoadHandled = useRef(false);

  useEffect(() => {
    if (isLoading || initialLoadHandled.current) return;

    const timeoutId = window.setTimeout(() => {
      initialLoadHandled.current = true;
      if (rows.some((row) => row.id > 0)) {
        setIsLocked(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, rows]);

  const saveAndLock = useCallback(async () => {
    if (await save()) {
      setIsLocked(true);
    }
  }, [save]);

  return {
    isLocked,
    unlock: () => setIsLocked(false),
    saveAndLock,
  };
}

export function useDeleteSelectedReservationRows<
  T extends SelectableRow,
>(
  endpoint: string,
  label: string,
  rows: T[],
  setRows: Dispatch<SetStateAction<T[]>>
) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSelectedRows = useCallback(async () => {
    const selectedRows = rows.filter((row) => row.selected);
    if (selectedRows.length === 0) return;

    if (!window.confirm(`Delete ${selectedRows.length} selected ${label} row(s)?`)) {
      return;
    }

    const deletedIds = new Set<number>();
    const failures: string[] = [];
    setIsDeleting(true);

    try {
      for (const row of selectedRows) {
        if (row.id < 0) {
          deletedIds.add(row.id);
          continue;
        }

        try {
          const response = await fetch(`${endpoint}?id=${row.id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!response.ok) {
            const data: unknown = await response.json();
            const message =
              typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : `Could not delete ${label} row ${row.id}.`;
            failures.push(message);
            continue;
          }

          deletedIds.add(row.id);
        } catch (error) {
          console.error(`Delete ${label} row ${row.id} failed:`, error);
          failures.push(
            error instanceof Error
              ? error.message
              : `Could not delete ${label} row ${row.id}.`
          );
        }
      }

      setRows((previous) =>
        previous.filter((row) => !deletedIds.has(row.id))
      );
    } finally {
      setIsDeleting(false);
    }

    if (failures.length > 0) {
      alert(
        `Some selected ${label} rows could not be deleted:\n${failures.join("\n")}`
      );
    }
  }, [endpoint, label, rows, setRows]);

  return {
    isDeleting,
    deleteSelectedRows,
  };
}
