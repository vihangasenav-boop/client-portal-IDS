"use client";

import { useEffect, useState } from "react";
import ModuleCard from "./ModuleCard";
import styles from "./DashboardPage.module.css";
import { FX_MODULES } from "./lib/modules";
import type { FXModule } from "./lib/types";

const PROPERTY_DATA_COLLECTION_MODULE: FXModule = {
  id: "property-data-collection",
  label: "Property Data Collection",
  href: "/property-module",
};

// Database code -> Frontend module ID
const MODULE_MAP: Record<string, string> = {
  fom: "frontoffice",
  pos: "pos",
  fas: "finance",
  mms: "mms",
  crs: "snc",
};

type ClientModule = {
  id: number;

  // IMPORTANT
  // This is PropertyModule.id
  propertyModuleId: number;

  code: string;
  name: string;
  description: string | null;
};

export default function ModuleGrid() {
  const [modules, setModules] = useState<ClientModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadModules = async () => {
      try {
        const res = await fetch(
          "/api/auth/clientAllowed-modules",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to load modules"
          );
        }

        setModules(
          Array.isArray(data.modules)
            ? data.modules
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load modules:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load modules"
        );

        setModules([]);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, []);

  if (loading) {
    return (
      <div className={styles.grid}>
        <div className="text-sm text-gray-500">
          Loading modules...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  /*
   * Convert database modules into frontend module IDs.
   */
  const allowedModules = modules
    .map((module) => {
      const code = module.code
        .toLowerCase()
        .trim();

      const frontendModuleId = MODULE_MAP[code];

      if (!frontendModuleId) {
        return null;
      }

      return {
        frontendModuleId,
        propertyModuleId: module.propertyModuleId,
      };
    })
    .filter(
      (
        module
      ): module is {
        frontendModuleId: string;
        propertyModuleId: number;
      } => module !== null
    );

  /*
   * Remove duplicate modules.
   */
  const uniqueModules = Array.from(
    new Map(
      allowedModules.map((module) => [
        module.frontendModuleId,
        module,
      ])
    ).values()
  );

  /*
   * Find the frontend module definitions.
   */
  const filteredModules = FX_MODULES.filter(
    (module) =>
      uniqueModules.some(
        (allowedModule) =>
          allowedModule.frontendModuleId ===
          module.id
      )
  );

  return (
    <div className={styles.grid}>

      {/* ========================================
          ALWAYS AVAILABLE
          ======================================== */}

      <ModuleCard
        key={PROPERTY_DATA_COLLECTION_MODULE.id}
        module={PROPERTY_DATA_COLLECTION_MODULE}
      />

      {/* ========================================
          DATABASE ASSIGNED MODULES
          ======================================== */}

      {filteredModules.length > 0 ? (
        filteredModules.map((module) => {
          const allowedModule =
            uniqueModules.find(
              (item) =>
                item.frontendModuleId ===
                module.id
            );

          return (
            <ModuleCard
              key={module.id}
              module={module}
              propertyModuleId={
                allowedModule?.propertyModuleId
              }
            />
          );
        })
      ) : (
        <div className="text-sm text-gray-500">
          No modules assigned for this property.
        </div>
      )}
    </div>
  );
}