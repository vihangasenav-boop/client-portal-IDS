export type LeadSegment = {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
};

export const emptyRow = (id: number): LeadSegment => ({
  id,
  code: "",
  name: "",
  isDefault: false,
  selected: false,
});