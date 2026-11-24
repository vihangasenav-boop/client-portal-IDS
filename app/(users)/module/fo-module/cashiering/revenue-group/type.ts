import { SacHsnType, sacHsnTypes } from "../revenue/type";

export { sacHsnTypes };

export const revenueGroupClassifications = [
  { value: "Accomodation", label: "Accommodation" },
  { value: "TransportRevenue", label: "Transport Revenue" },
  { value: "ShopSales", label: "Shop Sales" },
  { value: "FAndBFloorCode", label: "F&B floorCode" },
  { value: "Tax", label: "Tax" },
] as const;

export type RevenueGroupClassification =
  (typeof revenueGroupClassifications)[number]["value"];

export type RevenueOption = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

export type RevenueGroupRow = {
  id: number;
  code: string;
  name: string;
  revenueGroupClassification: RevenueGroupClassification;
  revenueIds: number[];
  sacHsn: SacHsnType;
  sacHsnNumber: string;
  isDefault: boolean;
  isActive: boolean;
};

export type RevenueGroupErrors = Partial<
  Record<"code" | "name" | "revenueIds", string>
>;

export const emptyRevenueGroup = (id: number): RevenueGroupRow => ({
  id,
  code: "",
  name: "",
  revenueGroupClassification: "Accomodation",
  revenueIds: [],
  sacHsn: "SAC",
  sacHsnNumber: "",
  isDefault: false,
  isActive: true,
});
