export type MarketSegmentGroup = {
  id: number;
  code: string;
  name: string;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
};

export const emptyRow = (
  id: number
): MarketSegmentGroup => ({
  id,
  code: "",
  name: "",
  selected: false,
});