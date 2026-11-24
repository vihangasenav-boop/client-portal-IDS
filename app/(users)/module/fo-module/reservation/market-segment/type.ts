export type MarketSegment = {
  id: number;
  code: string;
  name: string;
  marketSegmentGroupId: number;
  displaySequence: number;
  selected: boolean;
};

export type MarketSegmentGroup = {
  id: number;
  code: string;
  name: string;
};

export type RowErrors = {
  code?: string;
  name?: string;
  marketSegmentGroupId?: string;
  displaySequence?: string;
};

export const emptyRow = (id: number): MarketSegment => ({
  id,
  code: "",
  name: "",
  marketSegmentGroupId: 0,
  displaySequence: 0,
  selected: false,
});