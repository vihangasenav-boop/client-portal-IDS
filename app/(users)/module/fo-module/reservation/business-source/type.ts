export type BusinessSource = {
  id: number;
  code: string;
  name: string;
  businessSourceGroupId: number;
  displaySequence: number;
  selected: boolean;
};

export type BusinessSourceGroup = {
  id: number;
  code: string;
  name: string;
};

export type RowErrors = {
  code?: string;
  name?: string;
  businessSourceGroupId?: string;
  displaySequence?: string;
};

export const emptyRow = (
  id: number,
  displaySequence = 1
): BusinessSource => ({
  id,
  code: "",
  name: "",
  businessSourceGroupId: 0,
  displaySequence,
  selected: false,
});