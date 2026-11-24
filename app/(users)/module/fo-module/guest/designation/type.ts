export type DesignationType = "Hotel" | "Guest";

export type Designation = {
  id: number;
  code: string;
  name: string;
  type: DesignationType | "";
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  type?: string;
};

export const emptyRow = (id: number): Designation => ({
  id,
  code: "",
  name: "",
  type: "Hotel",
  selected: false,
});
