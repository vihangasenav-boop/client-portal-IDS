export type SubAccountType = {
  id: number;
  accountTypeId: number;
  code: string;
  name: string;
  isDefault: boolean;
  selected: boolean;
};

export type AccountTypeOption = {
  id: number;
  code: string;
  name: string;
};

export type RowErrors = {
  accountTypeId?: string;
  code?: string;
  name?: string;
};

export const emptyRow = (id: number): SubAccountType => ({
  id,
  accountTypeId: 0,
  code: "",
  name: "",
  isDefault: false,
  selected: false,
});