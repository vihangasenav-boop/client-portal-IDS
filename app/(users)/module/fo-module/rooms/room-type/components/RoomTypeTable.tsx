"use client";

import { Trash2 } from "lucide-react";
import {
  RoomAmenity,
  RoomFeature,
  RoomType,
  RowErrors,
} from "../type";

type Props = {
  rows: RoomType[];
  roomFeatures: RoomFeature[];
  roomAmenities: RoomAmenity[];
  errors: Record<number, RowErrors>;
  isLoading: boolean;

  onChange: (
    id: number,
    field: keyof RoomType,
    value:
      | string
      | number
      | boolean
      | number[]
  ) => void;

  onRemove: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
};

export default function RoomTypeTable({
  rows,
  roomFeatures,
  roomAmenities,
  errors,
  isLoading,
  onChange,
  onRemove,
  onSelectAll,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1800px] w-full border-separate border-spacing-0 text-sm text-black">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-10 border-b border-slate-200 px-3 py-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                onChange={(e) =>
                  onSelectAll(e.target.checked)
                }
              />
            </th>

            <th className="w-12 border-b border-slate-200 px-3 py-3">
              #
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Classification
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Type Code <span className="text-red-500">*</span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Type Name <span className="text-red-500">*</span>
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Upgrade Level
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Display Sequence
            </th>

            <th className="w-32 border-b border-slate-200 px-3 py-3 text-left">
              Is Default
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Description
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Over Booking %
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Features
            </th>

            <th className="border-b border-slate-200 px-3 py-3 text-left">
              Room Amenities
            </th>

            <th className="w-20 border-b border-slate-200 px-3 py-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={13}
                className="p-8 text-center text-slate-500"
              >
                Loading room types...
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowErrors = errors[row.id] ?? {};

              return (
              <tr key={row.id} className="transition-colors hover:bg-orange-50/40">
                {/* Select */}
                <td className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "selected",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </td>

                {/* Number */}
                <td className="border-b border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                  {index + 1}
                </td>

                {/* Classification */}
                <td className="border-b border-slate-100 p-0">
                  <select
                    value={row.classification}
                    title={rowErrors.classification || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "classification",
                        e.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  >
                    <option value="Room">
                      Room
                    </option>
                    <option value="Pseudo Room">
                      Pseudo Room
                    </option>
                    <option value="Component Room">
                      Component Room
                    </option>
                  </select>
                  {rowErrors.classification && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.classification}</p>}
                </td>

                {/* Code */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.code ? "bg-red-50" : ""}`}>
                  <input
                    value={row.code}
                    title={rowErrors.code || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "code",
                        e.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {rowErrors.code && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.code}</p>}
                </td>

                {/* Name */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.name ? "bg-red-50" : ""}`}>
                  <input
                    value={row.name}
                    title={rowErrors.name || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "name",
                        e.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {rowErrors.name && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.name}</p>}
                </td>

                {/* Upgrade Level */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.upgradeLevel ? "bg-red-50" : ""}`}>
                  <input
                    type="number"
                    value={row.upgradeLevel}
                    title={rowErrors.upgradeLevel || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "upgradeLevel",
                        Number(e.target.value)
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {rowErrors.upgradeLevel && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.upgradeLevel}</p>}
                </td>

                {/* Display Sequence */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.displaySequence ? "bg-red-50" : ""}`}>
                  <input
                    type="number"
                    value={row.displaySequence}
                    title={rowErrors.displaySequence || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "displaySequence",
                        Number(e.target.value)
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {rowErrors.displaySequence && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.displaySequence}</p>}
                </td>

                {/* Is Default */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.isDefault ? "bg-red-50" : ""}`}>
                  <select
                    value={
                      row.isDefault
                        ? "Yes"
                        : "No"
                    }
                    title={rowErrors.isDefault || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "isDefault",
                        e.target.value === "Yes"
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  >
                    <option value="No">
                      No
                    </option>
                    <option value="Yes">
                      Yes
                    </option>
                  </select>
                  {rowErrors.isDefault && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.isDefault}</p>}
                </td>

                {/* Description */}
                <td className="border-b border-slate-100 p-0">
                  <input
                    value={row.description}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "description",
                        e.target.value
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                </td>

                {/* Over Booking */}
                <td className={`border-b border-slate-100 p-0 ${rowErrors.overBooking ? "bg-red-50" : ""}`}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={row.overBooking}
                    title={rowErrors.overBooking || ""}
                    onChange={(e) =>
                      onChange(
                        row.id,
                        "overBooking",
                        Number(e.target.value)
                      )
                    }
                    className="min-h-[44px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  />
                  {rowErrors.overBooking && <p className="px-3 pb-2 text-xs text-red-600">{rowErrors.overBooking}</p>}
                </td>

                {/* Room Features - Multiple */}
                <td className="border-b border-slate-100 p-0">
                  <select
                    multiple
                    value={row.roomFeatureIds.map(
                      String
                    )}
                    onChange={(e) => {
                      const ids =
                        Array.from(
                          e.target.selectedOptions
                        ).map((option) =>
                          Number(option.value)
                        );

                      onChange(
                        row.id,
                        "roomFeatureIds",
                        ids
                      );
                    }}
                    className="min-h-[80px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  >
                    {roomFeatures.map(
                      (feature) => (
                        <option
                          key={feature.id}
                          value={feature.id}
                        >
                          {feature.code} -{" "}
                          {feature.name}
                        </option>
                      )
                    )}
                  </select>
                </td>

                {/* Room Amenities - Multiple */}
                <td className="border-b border-slate-100 p-0">
                  <select
                    multiple
                    value={row.roomAmenityIds.map(
                      String
                    )}
                    onChange={(e) => {
                      const ids =
                        Array.from(
                          e.target.selectedOptions
                        ).map((option) =>
                          Number(option.value)
                        );

                      onChange(
                        row.id,
                        "roomAmenityIds",
                        ids
                      );
                    }}
                    className="min-h-[80px] w-full bg-transparent px-3 py-2 text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  >
                    {roomAmenities.map(
                      (amenity) => (
                        <option
                          key={amenity.id}
                          value={amenity.id}
                        >
                          {amenity.code} -{" "}
                          {amenity.name}
                        </option>
                      )
                    )}
                  </select>
                </td>

                {/* Delete */}
                <td className="border-b border-slate-100 px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      onRemove(row.id)
                    }
                    aria-label={`Delete ${row.name || "room type"} row`}
                    title="Delete row"
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