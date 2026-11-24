export type DepartmentOption = {
  id: number;
  code: string;
  name: string;
};

export type TraceDefinition = {
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

export function emptyTraceDefinition(id: number): TraceDefinition {
  return {
    id,
    departmentId: 0,
    code: "",
    name: "",
    isDefault: false,
    selected: false,
  };
}
