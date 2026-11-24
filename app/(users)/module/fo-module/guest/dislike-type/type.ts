export type DislikeType = {
  id: number;
  code: string;
  name: string;
  displaySequence: number;
  isDefault: boolean;
  isActive: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  displaySequence?: string;
  isDefault?: string;
};

export const emptyRow = (id: number): DislikeType => ({
  id,
  code: "",
  name: "",
  displaySequence: 0,
  isDefault: false,
  isActive: true,
  selected: false,
});
