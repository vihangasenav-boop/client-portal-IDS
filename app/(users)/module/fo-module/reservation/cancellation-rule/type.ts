export type CancellationRuleType =
  | "Flat"
  | "Percentage"
  | "Arrival Night percentage"
  | "Nights"
  | "Non Cancellation";

export type CancellationRule = {
  id: number;
  code: string;
  name: string;
  type: CancellationRuleType;
  amount: number;
  daysBeforeArrival: number;
  displaySequence: number;
  cancelBeforeTime: string;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  type?: string;
  amount?: string;
  daysBeforeArrival?: string;
  displaySequence?: string;
  cancelBeforeTime?: string;
};

export const CANCELLATION_RULE_TYPES: CancellationRuleType[] = [
  "Flat",
  "Percentage",
  "Arrival Night percentage",
  "Nights",
  "Non Cancellation",
];

export const emptyRow = (
  id: number
): CancellationRule => ({
  id,
  code: "",
  name: "",
  type: "Flat",
  amount: 0,
  daysBeforeArrival: 0,
  displaySequence: 0,
  cancelBeforeTime: "",
  selected: false,
});