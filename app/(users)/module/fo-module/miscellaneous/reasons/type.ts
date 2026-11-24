export type DepartmentModule =
  | "Front Office"
  | "Point of Sale"
  | "Housekeeping"
  | "Sales & Marketing"
  | "Finance";

export type Operation =
  | "Cancel Reservations"
  | "Delete Reservations";

export type Reason = {
  id: number;
  code: string;
  name: string;
  departmentModule: DepartmentModule | "";
  operations: Operation | "";
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  departmentModule?: string;
  operations?: string;
};

export const departmentModules: DepartmentModule[] = [
  "Front Office",
  "Point of Sale",
  "Housekeeping",
  "Sales & Marketing",
  "Finance",
];

export const operations: Operation[] = [
  "Cancel Reservations",
  "Delete Reservations",
];

export function emptyReason(id: number): Reason {
  return {
    id,
    code: "",
    name: "",
    departmentModule: "",
    operations: "",
    selected: false,
  };
}
