"use client";

import { Trash2 } from "lucide-react";
import {
  PaymentInstructionErrors,
  PaymentInstructionRow,
  paymentTypes,
  RelationOption,
} from "../type";

type Props = {
  rows: PaymentInstructionRow[];
  revenueGroups: RelationOption[];
  revenues: RelationOption[];
  errors: Record<number, PaymentInstructionErrors>;
  isLoading: boolean;
  onChange: (
    id: number,
    field: keyof PaymentInstructionRow,
    value: string | number | number[] | boolean
  ) => void;
  onRemove: (id: number) => void;
};

const inputClass =
  "min-h-11 w-full bg-transparent px-3 py-2 text-black outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400";

function RelationSelect({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: RelationOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  return (
    <div className="min-w-52 p-2">
      {options.length > 0 ? (
        <>
          <select
            aria-label={label}
            multiple
            value={selectedIds.map(String)}
            onChange={(event) =>
              onChange(Array.from(event.target.selectedOptions, (option) => Number(option.value)))
            }
            className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-black outline-none focus:ring-2 focus:ring-orange-400"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.code} - {option.name}{!option.isActive ? " (inactive)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Use Ctrl/Cmd-click to select multiple.</p>
        </>
      ) : (
        <p className="text-sm text-slate-500">No options available.</p>
      )}
    </div>
  );
}

export default function PaymentInstructionTable({
  rows,
  revenueGroups,
  revenues,
  errors,
  isLoading,
  onChange,
  onRemove,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-sm text-black">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-12 border-b border-slate-200 px-3 py-3">#</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Code *</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Name *</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Multilingual Name *</th>
            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">Sequence</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Description</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Revenue Groups</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Revenues</th>
            <th className="w-28 border-b border-slate-200 px-3 py-3 text-left">Split</th>
            <th className="border-b border-slate-200 px-3 py-3 text-left">Payment Type</th>
            <th className="w-40 border-b border-slate-200 px-3 py-3 text-left">Transaction Limit</th>
            <th className="w-28 border-b border-slate-200 px-3 py-3">Force Payment</th>
            <th className="w-20 border-b border-slate-200 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={13} className="p-8 text-center text-slate-500">
                Loading payment instructions...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={13} className="p-8 text-center text-slate-500">
                No payment instructions added yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors[row.id];
              return (
                <tr key={row.id}>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    {index + 1}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Payment instruction code"
                      value={row.code}
                      onChange={(event) => onChange(row.id, "code", event.target.value)}
                      className={`${inputClass} ${rowErrors?.code ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Payment instruction name"
                      value={row.name}
                      onChange={(event) => onChange(row.id, "name", event.target.value)}
                      className={`${inputClass} ${rowErrors?.name ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Multilingual name"
                      value={row.nameMultilingual}
                      onChange={(event) => onChange(row.id, "nameMultilingual", event.target.value)}
                      className={`${inputClass} ${rowErrors?.nameMultilingual ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.nameMultilingual && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.nameMultilingual}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Display sequence"
                      type="number"
                      min="0"
                      step="1"
                      value={row.displaySequence}
                      onChange={(event) =>
                        onChange(row.id, "displaySequence", Number(event.target.value))
                      }
                      className={`${inputClass} ${rowErrors?.displaySequence ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.displaySequence && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.displaySequence}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Description"
                      value={row.description}
                      onChange={(event) => onChange(row.id, "description", event.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <RelationSelect
                      label="Revenue groups"
                      options={revenueGroups}
                      selectedIds={row.revenueGroupIds}
                      onChange={(ids) => onChange(row.id, "revenueGroupIds", ids)}
                    />
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <RelationSelect
                      label="Revenues"
                      options={revenues}
                      selectedIds={row.revenueIds}
                      onChange={(ids) => onChange(row.id, "revenueIds", ids)}
                    />
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Split"
                      type="number"
                      min="0"
                      step="1"
                      value={row.split}
                      onChange={(event) => onChange(row.id, "split", Number(event.target.value))}
                      className={`${inputClass} ${rowErrors?.split ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.split && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.split}</p>}
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <select
                      aria-label="Payment type"
                      value={row.paymentType}
                      onChange={(event) => onChange(row.id, "paymentType", event.target.value)}
                      className={inputClass}
                    >
                      {paymentTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-slate-100 p-0">
                    <input
                      aria-label="Transaction limit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.transactionLimit}
                      onChange={(event) => onChange(row.id, "transactionLimit", event.target.value)}
                      className={`${inputClass} ${rowErrors?.transactionLimit ? "bg-red-50" : ""}`}
                    />
                    {rowErrors?.transactionLimit && (
                      <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.transactionLimit}</p>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <input
                      aria-label="Force payment"
                      type="checkbox"
                      checked={row.forcePayment}
                      onChange={(event) => onChange(row.id, "forcePayment", event.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      aria-label={`Delete ${row.name || "payment instruction"} row`}
                      className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
