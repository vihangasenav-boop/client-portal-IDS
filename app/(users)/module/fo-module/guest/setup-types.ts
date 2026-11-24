export type GuestSetupEntity =
  | "designation"
  | "document-type"
  | "dislike-type"
  | "membership-class"
  | "membership-type";

export type GuestSetupFieldKey =
  | "code"
  | "name"
  | "type"
  | "membershipClassId"
  | "displaySequence"
  | "isDefault"
  | "isActive";

export type GuestSetupRow = {
  id: number;
  selected: boolean;
  code: string;
  name: string;
  type: string;
  membershipClassId: number;
  displaySequence: number;
  isDefault: boolean;
  isActive: boolean;
};

export type GuestSetupField = {
  key: GuestSetupFieldKey;
  label: string;
  importLabel?: string;
  input: "text" | "number" | "select" | "boolean";
  required?: boolean;
  options?: { label: string; value: string }[];
};

export type GuestSetupConfig = {
  entity: GuestSetupEntity;
  title: string;
  description: string;
  templateName: string;
  fields: GuestSetupField[];
};

export type MembershipClassOption = {
  id: number;
  code: string;
  name: string;
};
