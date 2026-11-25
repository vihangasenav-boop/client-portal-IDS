"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountType, emptyRow, RowErrors } from "../type";
import { createDraftId } from "../../bulk-import-utils";


export function useAccountTypes() {
    const [propertyId, setPropertyId] = useState<string | null>(null);

    const [propertyIdLoading, setPropertyIdLoading] =
        useState(true);

    const [rows, setRows] = useState<AccountType[]>([
        emptyRow(createDraftId()),
    ]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [loadError, setLoadError] =
        useState<string | null>(null);

    const [errors, setErrors] =
        useState<Record<number, RowErrors>>({});

    // -----------------------------------------
    // Get property ID from logged-in user
    // -----------------------------------------

    useEffect(() => {
        let cancelled = false;

        async function loadProperty() {
            try {
                setPropertyIdLoading(true);

                const res = await fetch("/api/auth/auth-me", {
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error("Unauthorized");
                }

                const data = await res.json();

                if (cancelled) return;

                const userPropertyId = data?.user?.propertyId;

                if (!userPropertyId) {
                    setLoadError(
                        "No property selected for this user."
                    );
                    return;
                }

                setPropertyId(String(userPropertyId));
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

    // -----------------------------------------
    // Load account types
    // -----------------------------------------

    useEffect(() => {
        if (propertyIdLoading || !propertyId) {
            return;
        }

        let cancelled = false;

        async function load() {
            try {
                setIsLoading(true);
                setLoadError(null);

                const res = await fetch(
                    "/api/modules/fom/account-type",
                    {
                        credentials: "include",
                        cache: "no-store",
                    }
                );

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data?.error ||
                        "Failed to load account types"
                    );
                }

                if (cancelled) return;

                const loaded: AccountType[] =
                    (data.accountTypes ?? []).map((r: any) => ({
                        id: r.id,
                        code: r.code,
                        name: r.name,
                        isDefault: r.isDefault,
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
                        "Could not load existing account types."
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
    }, [propertyId, propertyIdLoading]);

    // -----------------------------------------
    // Validation
    // -----------------------------------------

    const validateRows = (
        dataRows: AccountType[]
    ) => {
        const newErrors: Record<number, RowErrors> = {};

        const codeCounts: Record<string, number> = {};
        const nameCounts: Record<string, number> = {};

        dataRows.forEach((row) => {
            const code =
                row.code.trim().toLowerCase();

            const name =
                row.name.trim().toLowerCase();

            if (code) {
                codeCounts[code] =
                    (codeCounts[code] || 0) + 1;
            }

            if (name) {
                nameCounts[name] =
                    (nameCounts[name] || 0) + 1;
            }
        });

        let isValid = true;

        dataRows.forEach((row) => {
            const code = row.code.trim();
            const name = row.name.trim();

            const rowErrors: RowErrors = {};

            if (!code) {
                rowErrors.code = "Code is required";
                isValid = false;
            } else if (code.length > 8) {
                rowErrors.code = "Code cannot exceed 8 characters";
                isValid = false;
            } else if (
                codeCounts[code.toLowerCase()] > 1
            ) {
                rowErrors.code = "Code must be unique";
                isValid = false;
            }

            if (!name) {
                rowErrors.name = "Name is required";
                isValid = false;
            } else if (name.length < 2) {
                rowErrors.name = "Name must be at least 2 characters";
                isValid = false;
            } else if (
                nameCounts[name.toLowerCase()] > 1
            ) {
                rowErrors.name = "Name must be unique";
                isValid = false;
            }

            if (
                rowErrors.code ||
                rowErrors.name
            ) {
                newErrors[row.id] = rowErrors;
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

            const res = await fetch(
                "/api/modules/fom/account-type",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rows: rows.map((row) => ({
                            id: row.id,
                            code: row.code,
                            name: row.name,
                            isDefault: row.isDefault,
                        })),
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                alert(
                    data?.error ||
                    "Failed to save data."
                );

                return false;
            }

            const saved: AccountType[] =
                (data.accountTypes ?? []).map(
                    (row: any) => ({
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        isDefault: row.isDefault,
                        selected: false,
                    })
                );

            setRows(saved);
            setErrors({});

            alert("Data saved successfully!");
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
    }, [propertyId, rows]);

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