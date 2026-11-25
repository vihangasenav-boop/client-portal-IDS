export type ReservationTypeGroup =
  | ""
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
  id: number,
  displaySequence = 1
): ReservationType => ({
  id,
  code: "",
  name: "",
  group: "",
  displaySequence,
  isDefault: false,
  selected: false,
});

export function getNextDisplaySequence(
  rows: Pick<ReservationType, "displaySequence">[]
) {
  const usedSequences = new Set(
    rows
      .map((row) => row.displaySequence)
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0)
  );
  let nextSequence = 1;
  while (usedSequences.has(nextSequence)) {
    nextSequence++;
  }
  return nextSequence;
}