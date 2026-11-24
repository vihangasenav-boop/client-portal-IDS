export const revenueClassifications = [
  { value: "Cash", label: "Cash" },
  { value: "CreditCard", label: "Credit Card" },
  { value: "FrontOfficeCharge", label: "Front Office Charge" },
  { value: "FAndBOutlet", label: "F&B Outlet" },
  { value: "NonFAndBOutlet", label: "NON F&B Outlet" },
  { value: "RoomRate", label: "Room Rate" },
  { value: "Tax", label: "Tax" },
  { value: "MealPlan", label: "Meal Plan" },
  { value: "LoyaltyRedemptions", label: "Loyalty Redemptions" },
  { value: "GiftVoucher", label: "Gift Voucher" },
] as const;

export const revenueTypes = ["Both", "Debit", "Credit"] as const;
export const sacHsnTypes = ["SAC", "HSN"] as const;

export type RevenueClassification =
  (typeof revenueClassifications)[number]["value"];
export type RevenueType = (typeof revenueTypes)[number];
export type SacHsnType = (typeof sacHsnTypes)[number];

export type Revenue = {
  id: number;
  code: string;
  name: string;
  classification: RevenueClassification;
  type: RevenueType;
  sacHsn: SacHsnType;
  sacHsnNumber: string;
  displaySequence: number;
  isDefault: boolean;
  isActive: boolean;
};

export type RevenueRowErrors = Partial<
  Record<"code" | "name" | "sacHsnNumber" | "displaySequence", string>
>;

export const emptyRevenue = (id: number): Revenue => ({
  id,
  code: "",
  name: "",
  classification: "Cash",
  type: "Both",
  sacHsn: "SAC",
  sacHsnNumber: "",
  displaySequence: 0,
  isDefault: false,
  isActive: true,
});
