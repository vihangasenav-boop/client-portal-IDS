export type ReservationTypeGroup =
  | "WAITLIST"
  | "CONFIRM"
  | "TENTATIVE";

export type ReservationType = {
  id: number;
  code: string;
  name: string;
  group: ReservationTypeGroup;
  displaySequence: number;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  group?: string;
  displaySequence?: string;
};

export const emptyRow = (
  id: number
): ReservationType => ({
  id,
  code: "",
  name: "",
  group: "CONFIRM",
  displaySequence: 0,
  isDefault: false,
  selected: false,
});