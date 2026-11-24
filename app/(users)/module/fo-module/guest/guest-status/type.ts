export type GuestStatusGroup = "VVIP" | "VIP" | "OTHERS" | "HONEYMOON";

export type GuestStatus = {
  id: number;
  code: string;
  name: string;
  group: GuestStatusGroup | "";
  displaySequence: number;
  isDefault: boolean;
  isActive: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  group?: string;
  displaySequence?: string;
  isDefault?: string;
};

export const emptyRow = (id: number): GuestStatus => ({
  id,
  code: "",
  name: "",
  group: "OTHERS",
  displaySequence: 0,
  isDefault: false,
  isActive: true,
  selected: false,
});
