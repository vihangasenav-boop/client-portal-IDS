export type AccountType = {
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

export type Selection = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

export const columns: (keyof AccountType)[] = [
  "code",
  "name",
  "isDefault",
];

export const emptyRow = (id: number): AccountType => ({
  id,
  code: "",
  name: "",
  isDefault: false,
  selected: false,
});