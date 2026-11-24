"use client";

import { useEffect, useState } from "react";
import { createDraftId } from "../../../business-accounts/bulk-import-utils";
import {
  emptyRow,
  MembershipClassOption,
  MembershipType,
  RowErrors,
} from "../type";

const API_URL = "/api/modules/fom/membership-type";

export function useMembershipTypes() {
  const [rows, setRows] = useState<MembershipType[]>([emptyRow(createDraftId())]);
  const [membershipClasses, setMembershipClasses] = useState<MembershipClassOption[]>([]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(API_URL, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load membership types.");
        if (cancelled) return;

        const classes: MembershipClassOption[] = data.membershipClasses ?? [];
        const loadedRows: MembershipType[] = (data.rows ?? []).map(
          (row: Omit<MembershipType, "selected">) => ({
            ...row,
            selected: false,
          })
        );
        setMembershipClasses(classes);
        setRows(loadedRows.length ? loadedRows : [emptyRow(createDraftId(), classes)]);
      } catch (error) {
        console.error("Load membership types failed:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load membership types."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (
    id: number,
    field: keyof MembershipType,
    value: string | number | boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const addRow = () => {
    setRows((current) => [...current, emptyRow(createDraftId(), membershipClasses)]);
  };

  const setDefaultRow = (id: number, checked: boolean) => {
    const target = rows.find((row) => row.id === id);
    if (!target) return;
    setRows((current) =>
      current.map((row) => ({
        ...row,
        isDefault: checked
          ? row.membershipClassId === target.membershipClassId && row.id === id
          : row.id === id
            ? false
            : row.isDefault,
      }))
    );
  };

  const validateRows = (candidateRows: MembershipType[]) => {
    const newErrors: Record<number, RowErrors> = {};
    const codeCounts = new Map<string, number>();
    const nameCounts = new Map<string, number>();
    const defaultCounts = new Map<number, number>();
    for (const row of candidateRows) {
      const codeKey = `${row.membershipClassId}:${row.code.trim().toLowerCase()}`;
      const nameKey = `${row.membershipClassId}:${row.name.trim().toLowerCase()}`;
      if (row.code.trim()) codeCounts.set(codeKey, (codeCounts.get(codeKey) ?? 0) + 1);
      if (row.name.trim()) nameCounts.set(nameKey, (nameCounts.get(nameKey) ?? 0) + 1);
      if (row.isDefault) {
        defaultCounts.set(
          row.membershipClassId,
          (defaultCounts.get(row.membershipClassId) ?? 0) + 1
        );
      }
    }

    let isValid = true;
    for (const row of candidateRows) {
      const rowErrors: RowErrors = {};
      const codeKey = `${row.membershipClassId}:${row.code.trim().toLowerCase()}`;
      const nameKey = `${row.membershipClassId}:${row.name.trim().toLowerCase()}`;
      if (!membershipClasses.some((item) => item.id === row.membershipClassId)) {
        rowErrors.membershipClassId = "Select a membership class.";
      }
      if (!row.code.trim()) rowErrors.code = "Code is required.";
      else if ((codeCounts.get(codeKey) ?? 0) > 1) rowErrors.code = "Code must be unique within its class.";
      if (!row.name.trim()) rowErrors.name = "Name is required.";
      else if ((nameCounts.get(nameKey) ?? 0) > 1) rowErrors.name = "Name must be unique within its class.";
      if (!Number.isInteger(row.displaySequence) || row.displaySequence < 0) {
        rowErrors.displaySequence = "Display sequence must be a non-negative whole number.";
      }
      if (row.isDefault && (defaultCounts.get(row.membershipClassId) ?? 0) > 1) {
        rowErrors.isDefault = "Only one type can be default per membership class.";
      }
      if (Object.keys(rowErrors).length) {
        isValid = false;
        newErrors[row.id] = rowErrors;
      }
    }
    return { isValid, errors: newErrors };
  };

  const save = async () => {
    const validation = validateRows(rows);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return { success: false, message: "Please fix the highlighted rows before saving." };
    }
    setIsSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map(
            ({ id, membershipClassId, code, name, displaySequence, isDefault }) => ({
              id,
              membershipClassId,
              code,
              name,
              displaySequence,
              isDefault,
            })
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save membership types.");
      const classes: MembershipClassOption[] = data.membershipClasses ?? membershipClasses;
      const savedRows: MembershipType[] = (data.rows ?? []).map(
        (row: Omit<MembershipType, "selected">) => ({ ...row, selected: false })
      );
      setMembershipClasses(classes);
      setRows(savedRows.length ? savedRows : [emptyRow(createDraftId(), classes)]);
      setErrors({});
      return { success: true, message: "Membership types saved successfully." };
    } catch (error) {
      console.error("Save membership types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not save membership types.",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteIds = async (ids: number[]) => {
    if (ids.length === 0) return { success: true, message: "Rows removed." };
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete membership types.");
      return { success: true, message: data.message || "Selected rows deleted." };
    } catch (error) {
      console.error("Delete membership types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete membership types.",
      };
    }
  };

  const deleteAll = async () => {
    try {
      const response = await fetch(`${API_URL}?all=true`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete membership types.");
      setRows([emptyRow(createDraftId(), membershipClasses)]);
      setErrors({});
      return { success: true, message: "All membership types deleted." };
    } catch (error) {
      console.error("Delete all membership types failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Could not delete membership types.",
      };
    }
  };

  return {
    rows,
    setRows,
    membershipClasses,
    errors,
    setErrors,
    isLoading,
    isSaving,
    loadError,
    updateRow,
    addRow,
    setDefaultRow,
    save,
    deleteIds,
    deleteAll,
  };
}
