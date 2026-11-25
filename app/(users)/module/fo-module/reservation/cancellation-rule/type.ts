export type CancellationRuleType =
  | ""
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
  amount: number | null;
  daysBeforeArrival: number | null;
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
  id: number,
  displaySequence = 1
): CancellationRule => ({
  id,
  code: "",
  name: "",
  type: "",
  amount: null,
  daysBeforeArrival: null,
  displaySequence,
  cancelBeforeTime: "",
  selected: false,
});

export function getNextDisplaySequence(
  rows: Pick<CancellationRule, "displaySequence">[]
) {
  const usedSequences = new Set(
    rows
      .map((row) => row.displaySequence)
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0)
  );
  let nextSequence = 1;
  while (usedSequences.has(nextSequence)) nextSequence++;
  return nextSequence;
}