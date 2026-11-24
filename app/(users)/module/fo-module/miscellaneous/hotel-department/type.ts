export type DepartmentModule =
  | "Front Office"
  | "Point of Sale"
  | "Housekeeping"
  | "Sales & Marketing"
  | "Finance";

export type DesignationOption = {
  id: number;
  code: string;
  name: string;
  Type: "Hotel" | "Guest";
};

export type Department = {
  id: number;
  code: string;
  name: string;
  departmentModule: DepartmentModule | "";
  designationId: number;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  departmentModule?: string;
  designationId?: string;
};

export const departmentModules: DepartmentModule[] = [
  "Front Office",
  "Point of Sale",
  "Housekeeping",
  "Sales & Marketing",
  "Finance",
];

export function emptyDepartment(id: number): Department {
  return {
    id,
    code: "",
    name: "",
    departmentModule: "",
    designationId: 0,
    isDefault: false,
    selected: false,
  };
}
