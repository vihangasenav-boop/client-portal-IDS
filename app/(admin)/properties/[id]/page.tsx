
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { Topbar } from "../../components/layout/Topbar";
import { ModuleBadge } from "../../components/modules/ModuleIcon";

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

  // API response should provide these
  modules: PropertyModule[];
  users: PropertyUser[];
}

// =====================================================
// PAGE
// =====================================================

export default function PropertyDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const id =
    typeof params?.id === "string" ? Number(params.id) : null;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD PROPERTY
  // =====================================================

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid property ID");
      setLoading(false);
      return;
    }

    const loadProperty = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/admin-api/get-property?id=${id}`
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to load property"
          );
        }

        setProperty(data.property);
      } catch (err) {
        console.error("Failed to load property:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load property"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title={`Property Details${
          property ? ` — ${property.name}` : ""
        }`}
        action={
          <button
            type="button"
            onClick={() => router.push("/properties")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to properties
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto bg-gray-100 p-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

          {/* =====================================================
              LOADING
          ===================================================== */}

          {loading && (
            <p className="text-sm text-gray-500">
              Loading property…
            </p>
          )}

          {/* =====================================================
              ERROR
          ===================================================== */}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* =====================================================
              NOT FOUND
          ===================================================== */}

          {!loading && !error && !property && (
            <p className="text-sm text-gray-500">
              Property not found.
            </p>
          )}

          {/* =====================================================
              PROPERTY
          ===================================================== */}

          {!loading && !error && property && (
            <>
              {/* =================================================
                  BASIC INFORMATION
              ================================================= */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                {/* CODE */}

                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                    Code
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-orange-700">
                    {property.code}
                  </p>
                </div>

                {/* NAME */}

                <div className="rounded-2xl bg-white p-4 border border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    Name
                  </p>

                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {property.name}
                  </p>
                </div>

                {/* ADDRESS */}

                <div className="rounded-2xl bg-white p-4 border border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    Address
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    {property.address || "Not set"}
                  </p>
                </div>
              </div>

              {/* =================================================
                  MODULES
              ================================================= */}

              <div className="rounded-2xl bg-white border border-gray-100 p-4">

                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Modules
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {property.modules?.length > 0 ? (
                    property.modules.map(
                      (module: PropertyModule) => (
                        <ModuleBadge
                          key={module.id}
                          module={module}
                        />
                      )
                    )
                  ) : (
                    <p className="text-sm text-gray-500">
                      No modules assigned.
                    </p>
                  )}

                </div>
              </div>

              {/* =================================================
                  USERS
              ================================================= */}

              <div className="rounded-2xl bg-white border border-gray-100 p-4">

                <div className="mb-4">

                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    Assigned users
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Users linked to this property are shown below.
                  </p>

                </div>

                {property.users?.length > 0 ? (
                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">

                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">
                            Name
                          </th>

                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">
                            Email
                          </th>

                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">
                            Role
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {property.users.map(
                          (user: PropertyUser) => (
                            <tr
                              key={user.id}
                              className="border-b border-gray-100 last:border-0 hover:bg-orange-50/20"
                            >

                              <td className="px-4 py-3 text-xs font-medium text-gray-700">
                                {user.name}
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-600">
                                {user.email}
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-500">
                                {user.role}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No users are linked to this property yet.
                  </p>
                )}

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

