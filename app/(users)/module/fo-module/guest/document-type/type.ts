export type DocumentType = {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  isDefault?: string;
};

export const emptyRow = (id: number): DocumentType => ({
  id,
  code: "",
  name: "",
  isDefault: false,
  isActive: true,
  selected: false,
});
