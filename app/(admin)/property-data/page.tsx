"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Topbar } from "../components/layout/Topbar";

type PropertySummary = {
  id: number;
  code: string;
  name: string;
  address: string | null;
};

type TableOption = {
  key: string;
  label: string;
};

type DataRow = Record<string, unknown>;

type LoadedTable = TableOption & {
  rows: DataRow[];
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") {
    return JSON.stringify(value, (_key, nestedValue: unknown) =>
      typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue
    ) ?? "";
  }
  return String(value);
}

function formatColumnName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function columnsFor(rows: DataRow[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RecordsTable({ rows }: { rows: DataRow[] }) {
  const columns = columnsFor(rows);
  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-gray-500">No records in this table.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left text-xs text-gray-700">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap border-b border-gray-200 px-3 py-3 font-semibold">
                {formatColumnName(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={String(row.id ?? rowIndex)} className="align-top even:bg-gray-50/60">
              {columns.map((column) => (
                <td key={column} className="max-w-[360px] whitespace-pre-wrap break-words border-b border-gray-100 px-3 py-2">
                  {formatCell(row[column]) || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PropertyDataPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [rowSearchByTable, setRowSearchByTable] = useState<Record<string, string>>({});
  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTableKeys, setSelectedTableKeys] = useState<string[]>([]);
  const [loadedTables, setLoadedTables] = useState<LoadedTable[]>([]);
  const [printTables, setPrintTables] = useState<LoadedTable[] | null>(null);
  const [printMode, setPrintMode] = useState<"selected" | "all" | null>(null);
  const [printPending, setPrintPending] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isSelectingProperty, setIsSelectingProperty] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const tableRequestId = useRef(0);

  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();
    if (!query) return properties;
    return properties.filter((item) =>
      `${item.name} ${item.code} ${item.address ?? ""}`.toLowerCase().includes(query)
    );
  }, [properties, propertySearch]);

  const filteredTables = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) =>
      `${table.label} ${table.key}`.toLowerCase().includes(query)
    );
  }, [tableSearch, tables]);

  const selectedLoadedTables = useMemo(
    () => loadedTables.filter((table) => selectedTableKeys.includes(table.key)),
    [loadedTables, selectedTableKeys]
  );
  const displayedTables = printTables ?? selectedLoadedTables;

  function filteredRowsFor(table: LoadedTable) {
    const query = (rowSearchByTable[table.key] ?? "").trim().toLowerCase();
    if (!query) return table.rows;
    return table.rows.filter((row) =>
      Object.values(row).some((value) => formatCell(value).toLowerCase().includes(query))
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function loadProperties() {
      try {
        const response = await fetch("/api/admin-api/property-data", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load hotels.");
        if (!cancelled) setProperties(data.properties);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load hotels.");
        }
      } finally {
        if (!cancelled) setIsLoadingProperties(false);
      }
    }
    void loadProperties();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!printPending || !printTables) return;
    const timeout = window.setTimeout(() => {
      window.print();
      setPrintPending(false);
      setPrintTables(null);
      setPrintMode(null);
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [printPending, printTables]);

  async function handleSelectProperty(selected: PropertySummary) {
    const requestId = ++tableRequestId.current;
    setIsSelectingProperty(true);
    setError("");
    setTableError("");
    setProperty(selected);
    setTables([]);
    setSelectedTableKeys([]);
    setLoadedTables([]);
    setPrintTables(null);
    setTableSearch("");
    setRowSearchByTable({});
    setIsRunningAction(false);

    try {
      const params = new URLSearchParams({ code: selected.code });
      const response = await fetch(`/api/admin-api/property-data?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load hotel tables.");
      if (requestId === tableRequestId.current) setTables(data.tables);
    } catch (selectError) {
      if (requestId === tableRequestId.current) {
        setError(selectError instanceof Error ? selectError.message : "Could not load hotel tables.");
      }
    } finally {
      if (requestId === tableRequestId.current) setIsSelectingProperty(false);
    }
  }

  function handleBackToHotels() {
    tableRequestId.current += 1;
    setProperty(null);
    setTables([]);
    setSelectedTableKeys([]);
    setLoadedTables([]);
    setPrintTables(null);
    setTableSearch("");
    setRowSearchByTable({});
    setTableError("");
    setIsRunningAction(false);
  }

  function handleTableSelection(tableKey: string, checked: boolean) {
    setSelectedTableKeys((current) =>
      checked
        ? current.includes(tableKey) ? current : [...current, tableKey]
        : current.filter((key) => key !== tableKey)
    );
  }

  function handleSelectVisibleTables(checked: boolean) {
    const visibleKeys = filteredTables.map((table) => table.key);
    setSelectedTableKeys((current) =>
      checked
        ? [...new Set([...current, ...visibleKeys])]
        : current.filter((key) => !visibleKeys.includes(key))
    );
  }

  async function fetchTables(tableKeys: string[]) {
    if (!property) throw new Error("Select a hotel first.");
    if (tableKeys.length === 0) throw new Error("Select one or more tables first.");
    const params = new URLSearchParams({ code: property.code, tables: tableKeys.join(",") });
    const response = await fetch(`/api/admin-api/property-data?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Could not load selected tables.");
    if (!Array.isArray(data.tables)) throw new Error("The server returned an invalid table response.");
    return data.tables as LoadedTable[];
  }

  async function fetchAllPropertyTables() {
    if (!property) throw new Error("Select a hotel first.");
    const params = new URLSearchParams({ code: property.code, table: "all" });
    const response = await fetch(`/api/admin-api/property-data?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Could not load all hotel tables.");
    if (!Array.isArray(data.tables)) throw new Error("The server returned an invalid table response.");
    return data.tables as LoadedTable[];
  }

  async function loadAllPropertyTables() {
    setIsRunningAction(true);
    setIsLoadingAll(true);
    setTableError("");
    try {
      const allData = await fetchAllPropertyTables();
      setLoadedTables(allData);
      setSelectedTableKeys(allData.map((table) => table.key));
      setPrintTables(null);
      setPrintMode(null);
      setRowSearchByTable({});
    } catch (loadError) {
      setTableError(loadError instanceof Error ? loadError.message : "Could not load all hotel data.");
    } finally {
      setIsLoadingAll(false);
      setIsRunningAction(false);
    }
  }

  async function loadSelectedTables() {
    setIsRunningAction(true);
    setTableError("");
    try {
      const selectedData = await fetchTables(selectedTableKeys);
      setLoadedTables(selectedData);
    } catch (loadError) {
      setTableError(loadError instanceof Error ? loadError.message : "Could not load selected tables.");
    } finally {
      setIsRunningAction(false);
    }
  }

  async function downloadCsv() {
    if (selectedTableKeys.length === 0) return;
    setIsRunningAction(true);
    setTableError("");
    try {
      const selectedData = await fetchTables(selectedTableKeys);
      setLoadedTables(selectedData);
      const filteredTables = selectedData.map((table) => ({
        ...table,
        rows: filteredRowsFor(table),
      }));
      const columns = Array.from(new Set(filteredTables.flatMap((table) =>
        table.rows.flatMap((row) => Object.keys(row))
      )));
      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const lines = [
        ["Table Name", ...columns.map(formatColumnName)].map(escape).join(","),
        ...filteredTables.flatMap((table) =>
          table.rows.map((row) =>
            [table.label, ...columns.map((column) => formatCell(row[column]))].map(escape).join(",")
          )
        ),
      ];
      downloadBlob(
        new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
        `${safeFileName(property?.code ?? "hotel")}-selected-tables.csv`
      );
    } catch (downloadError) {
      setTableError(downloadError instanceof Error ? downloadError.message : "Could not download CSV.");
    } finally {
      setIsRunningAction(false);
    }
  }

  async function downloadExcel() {
    if (selectedTableKeys.length === 0) return;
    setIsRunningAction(true);
    setTableError("");
    try {
      const selectedData = await fetchTables(selectedTableKeys);
      setLoadedTables(selectedData);
      const workbook = XLSX.utils.book_new();
      for (const table of selectedData) {
        const rows = filteredRowsFor(table);
        const columns = columnsFor(table.rows);
        const worksheet = XLSX.utils.aoa_to_sheet([
          columns.map(formatColumnName),
          ...rows.map((row) => columns.map((column) => formatCell(row[column]))),
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, table.label.slice(0, 31));
      }
      XLSX.writeFile(workbook, `${safeFileName(property?.code ?? "hotel")}-selected-tables.xlsx`);
    } catch (downloadError) {
      setTableError(downloadError instanceof Error ? downloadError.message : "Could not download Excel file.");
    } finally {
      setIsRunningAction(false);
    }
  }

  async function printSelectedTables() {
    if (selectedTableKeys.length === 0) return;
    setIsRunningAction(true);
    setTableError("");
    try {
      const selectedData = await fetchTables(selectedTableKeys);
      setLoadedTables(selectedData);
      setPrintTables(selectedData);
      setPrintMode("selected");
      setPrintPending(true);
    } catch (printError) {
      setTableError(printError instanceof Error ? printError.message : "Could not prepare selected tables for printing.");
    } finally {
      setIsRunningAction(false);
    }
  }

  async function printAllPropertyTables() {
    if (!property) return;
    setIsRunningAction(true);
    setIsPrintingAll(true);
    setTableError("");
    try {
      const allData = await fetchAllPropertyTables();
      setPrintTables(allData);
      setPrintMode("all");
      setPrintPending(true);
    } catch (printError) {
      setTableError(printError instanceof Error ? printError.message : "Could not prepare all tables for printing.");
    } finally {
      setIsPrintingAll(false);
      setIsRunningAction(false);
    }
  }

  return (
    <div className="admin-data-browser-shell flex flex-1 flex-col overflow-hidden">
      <Topbar title="Property Data" />

      <main className="flex-1 space-y-5 overflow-y-auto bg-gray-100 p-5">
        {!property ? (
          <section className="admin-data-browser-controls rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Select a hotel</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a hotel by name or code to browse its read-only data.
                </p>
              </div>
              <label className="w-full sm:max-w-sm">
                <span className="sr-only">Search hotels</span>
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  placeholder="Search hotel name or code..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            {isLoadingProperties ? (
              <p className="mt-5 text-sm text-gray-500">Loading hotels...</p>
            ) : filteredProperties.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">
                {properties.length === 0 ? "No hotels found." : "No hotels match your search."}
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProperties.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleSelectProperty(item)}
                    disabled={isSelectingProperty}
                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/50 disabled:opacity-50"
                  >
                    <span className="block font-mono text-xs font-bold text-orange-600">{item.code}</span>
                    <span className="mt-1 block text-sm font-semibold text-gray-900">{item.name}</span>
                    {item.address && <span className="mt-1 block text-xs text-gray-500">{item.address}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="admin-data-browser-controls rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-orange-600">{property.code}</p>
                  <h1 className="mt-1 text-lg font-semibold text-gray-900">{property.name}</h1>
                  {property.address && <p className="mt-1 text-sm text-gray-500">{property.address}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    Select a table below to view all its records. Data is read-only.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadAllPropertyTables()}
                    disabled={isSelectingProperty || isRunningAction}
                    className="rounded-lg border border-orange-500 bg-white px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                  >
                    {isLoadingAll ? "Loading all data..." : "Load All Property Data"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void printAllPropertyTables()}
                    disabled={isSelectingProperty || isRunningAction}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {isPrintingAll ? "Preparing PDF..." : "Print All Tables / Save PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToHotels}
                    disabled={isRunningAction}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Back to hotels
                  </button>
                </div>
              </div>
            </section>

            <section className="admin-data-browser-controls rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Hotel tables</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {tables.length} property-related tables available
                    {selectedLoadedTables.length > 0 && ` · ${selectedLoadedTables.length} loaded`}
                  </p>
                </div>
                <label className="w-full sm:max-w-sm">
                  <span className="sr-only">Search tables</span>
                  <input
                    type="search"
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                    placeholder="Search table names..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>
              {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
              {tableError && <p role="alert" className="mt-4 text-sm text-red-600">{tableError}</p>}
              {isSelectingProperty ? (
                <p className="mt-4 text-sm text-gray-500">Loading table list...</p>
              ) : (
                <>
                  {filteredTables.length > 0 && (
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={filteredTables.every((table) => selectedTableKeys.includes(table.key))}
                        disabled={isRunningAction}
                        onChange={(event) => handleSelectVisibleTables(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      Select all {filteredTables.length} visible tables
                    </label>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredTables.map((table) => (
                      <label
                        key={table.key}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          selectedTableKeys.includes(table.key)
                            ? "border-orange-500 bg-orange-50 font-semibold text-orange-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTableKeys.includes(table.key)}
                          disabled={isRunningAction}
                          onChange={(event) => handleTableSelection(table.key, event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        {table.label}
                      </label>
                    ))}
                    {filteredTables.length === 0 && (
                      <p className="text-sm text-gray-500">No tables match your search.</p>
                    )}
                  </div>
                </>
              )}
            </section>

            {selectedTableKeys.length > 0 && (
              <section className="admin-data-browser-controls rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadSelectedTables()}
                    disabled={isRunningAction}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isRunningAction ? "Loading..." : `View ${selectedTableKeys.length} Selected Tables`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void printSelectedTables()}
                    disabled={isRunningAction}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    Print Selected / Save PDF
                  </button>
                  <button
                    type="button"
                    onClick={downloadCsv}
                    disabled={isRunningAction}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Download Selected CSV
                  </button>
                  <button
                    type="button"
                    onClick={downloadExcel}
                    disabled={isRunningAction}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Download Selected Excel
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {displayedTables.length > 0 && (
          <section className="admin-data-print-area rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-200 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                {property?.code} · {property?.name}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                {printMode === "all" ? "All Property Tables" : "Selected Property Tables"}
              </h2>
            </header>

            <div className="p-4">
              {displayedTables.map((table) => {
                const filteredRows = filteredRowsFor(table);
                return (
                  <section key={table.key} className="print-table-section mb-6">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3 print:hidden">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {table.label} <span className="font-normal text-gray-500">({filteredRows.length} of {table.rows.length} rows)</span>
                      </h3>
                      <label className="w-full sm:max-w-sm">
                        <span className="sr-only">Search rows in {table.label}</span>
                        <input
                          type="search"
                          value={rowSearchByTable[table.key] ?? ""}
                          onChange={(event) =>
                            setRowSearchByTable((current) => ({
                              ...current,
                              [table.key]: event.target.value,
                            }))
                          }
                          placeholder={`Search ${table.label} rows...`}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                    </div>
                    <h3 className="mb-2 hidden text-sm font-semibold text-gray-900 print:block">
                      {table.label} ({filteredRows.length} rows)
                    </h3>
                    <RecordsTable rows={filteredRows} />
                  </section>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
