"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Topbar } from "../components/layout/Topbar";
import { ModuleBadge } from "../components/modules/ModuleIcon";
import { AccessStatus } from "../types";

// =====================================================
// TYPES
// =====================================================

interface PropertyModule {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

interface PropertyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

interface Property {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  modules: PropertyModule[];
  users: PropertyUser[];
}

interface PropertyCounts {
  allowed: number;
  denied: number;
  pending: number;
}

// =====================================================
// ACCESS COUNTS
// =====================================================

function getAccessCounts(property: Property): PropertyCounts {
  const users = Array.isArray(property.users)
    ? property.users
    : [];

  const userCount = users.length;

  return {
    allowed: userCount,
    denied: 0,
    pending: 0,
  };
}

// =====================================================
// ACCESS PILL
// =====================================================

function renderAccessPill(
  status: AccessStatus,
  count: number
) {
  if (!count) return null;

  const classes: Record<AccessStatus, string> = {
    allowed: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    pending: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      key={status}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${classes[status]}`}
    >
      {count} {status}
    </span>
  );
}

// =====================================================
// DASHBOARD
// =====================================================

export default function DashboardPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState<
    AccessStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ===================================================
  // LOAD PROPERTIES
  // ===================================================

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin-api/get-property");

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to load properties"
          );
        }

        setProperties(data.properties || []);
      } catch (err) {
        console.error(
          "Failed to load properties:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load properties"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  // ===================================================
  // DASHBOARD COUNTS
  // ===================================================

  const counts = useMemo(() => {
    const summary = {
      total: properties.length,
      allowed: 0,
      denied: 0,
      pending: 0,
    };

    for (const property of properties) {
      const access = getAccessCounts(property);

      summary.allowed += access.allowed;
      summary.denied += access.denied;
      summary.pending += access.pending;
    }

    return summary;
  }, [properties]);

  // ===================================================
  // FILTER
  // ===================================================

  const filtered = useMemo(() => {
    if (filter === "all") {
      return properties;
    }

    return properties.filter((property) => {
      const access = getAccessCounts(property);

      if (filter === "allowed") {
        return access.allowed > 0;
      }

      if (filter === "denied") {
        return access.denied > 0;
      }

      if (filter === "pending") {
        return access.pending > 0;
      }

      return true;
    });
  }, [filter, properties]);

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* =================================================
          TOPBAR
      ================================================= */}

      <Topbar
        title="Dashboard — Property Access Overview"
        action={
          <button
            type="button"
            onClick={() =>
              router.push("/properties/create-property")
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white transition-colors bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            <Plus size={13} />
            Add Property
          </button>
        }
      />

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 p-5 overflow-y-auto bg-gray-100">

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="p-6 mb-5 bg-white border border-gray-200 rounded-xl text-sm text-gray-500">
            Loading property access data...
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {!loading && error && (
          <div className="p-6 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="grid grid-cols-1 gap-3 mb-5 md:grid-cols-4">

          {/* TOTAL */}

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="mb-1 text-xs text-gray-400">
              Total Properties
            </p>

            <p className="text-2xl font-semibold text-orange-500">
              {counts.total}
            </p>
          </div>

          {/* ALLOWED */}

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="mb-1 text-xs text-gray-400">
              Access Allowed
            </p>

            <p className="text-2xl font-semibold text-green-600">
              {counts.allowed}
            </p>
          </div>

          {/* DENIED */}

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="mb-1 text-xs text-gray-400">
              Access Denied
            </p>

            <p className="text-2xl font-semibold text-red-600">
              {counts.denied}
            </p>
          </div>

          {/* PENDING */}

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="mb-1 text-xs text-gray-400">
              Pending Review
            </p>

            <p className="text-2xl font-semibold text-amber-600">
              {counts.pending}
            </p>
          </div>

        </div>

        {/* =================================================
            PROPERTY TABLE
        ================================================= */}

        <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 md:flex-row md:items-center md:justify-between">

            <h2 className="text-sm font-semibold text-gray-800">
              Property Access Overview
            </h2>

            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as
                    | AccessStatus
                    | "all"
                )
              }
              className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="allowed">
                Allowed
              </option>

              <option value="denied">
                Denied
              </option>

              <option value="pending">
                Pending
              </option>
            </select>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Property code
                  </th>

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Property name
                  </th>

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Modules
                  </th>

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Access summary
                  </th>

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Users
                  </th>

                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {filtered.length === 0 ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No properties found.
                    </td>
                  </tr>

                ) : (

                  filtered.map((property) => {

                    const accessCounts =
                      getAccessCounts(property);

                    return (
                      <tr
                        key={property.id}
                        className="transition-colors border-b border-gray-50 hover:bg-orange-50/30 last:border-0"
                      >

                        {/* PROPERTY CODE */}

                        <td className="px-4 py-3 font-mono text-xs font-bold text-orange-500">
                          {property.code}
                        </td>

                        {/* PROPERTY NAME */}

                        <td className="px-4 py-3 text-xs font-medium text-gray-800">
                          {property.name}
                        </td>

                        {/* MODULES */}

                        <td className="px-4 py-3">

                          <div className="flex flex-wrap gap-1">

                            {property.modules?.length > 0 ? (

                              property.modules.map(
                                (
                                  module: PropertyModule
                                ) => (
                                  <ModuleBadge
                                    key={module.id}
                                    module={module}
                                  />
                                )
                              )

                            ) : (

                              <span className="text-xs text-gray-400">
                                No modules
                              </span>

                            )}

                          </div>

                        </td>

                        {/* ACCESS */}

                        <td className="px-4 py-3">

                          <div className="flex flex-wrap gap-2">

                            {renderAccessPill(
                              "allowed",
                              accessCounts.allowed
                            )}

                            {renderAccessPill(
                              "denied",
                              accessCounts.denied
                            )}

                            {renderAccessPill(
                              "pending",
                              accessCounts.pending
                            )}

                            {accessCounts.allowed === 0 &&
                              accessCounts.denied === 0 &&
                              accessCounts.pending === 0 && (
                                <span className="text-xs text-gray-400">
                                  No access
                                </span>
                              )}

                          </div>

                        </td>

                        {/* USERS */}

                        <td className="px-4 py-3 text-xs text-gray-400">
                          {property.users?.length ?? 0}
                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-3">

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/properties/${property.id}`
                              )
                            }
                            className="text-xs font-medium text-orange-500 hover:underline"
                          >
                            View details →
                          </button>

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

        </div>

      </main>
    </div>
  );
}