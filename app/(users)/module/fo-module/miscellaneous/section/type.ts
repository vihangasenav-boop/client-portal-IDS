export type DepartmentOption = {
  id: number;
  code: string;
  name: string;
};

export type Section = {
  id: number;
  departmentId: number;
  code: string;
  name: string;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  departmentId?: string;
  code?: string;
  name?: string;
};

export function emptySection(id: number): Section {
  return {
    id,
    departmentId: 0,
    code: "",
    name: "",
    isDefault: false,
    selected: false,
  };
}
