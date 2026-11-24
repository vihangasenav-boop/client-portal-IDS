export type Origin = {
  id: number;
  code: string;
  name: string;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
};

export const emptyRow = (id: number): Origin => ({
  id,
  code: "",
  name: "",
  selected: false,
});