export type MembershipType = {
  id: number;
  membershipClassId: number;
  code: string;
  name: string;
  displaySequence: number;
  isDefault: boolean;
  selected: boolean;
};

export type MembershipClassOption = {
  id: number;
  code: string;
  name: string;
};

export type RowErrors = {
  membershipClassId?: string;
  code?: string;
  name?: string;
  displaySequence?: string;
  isDefault?: string;
};

export const emptyRow = (
  id: number,
  membershipClasses: MembershipClassOption[] = []
): MembershipType => ({
  id,
  membershipClassId: membershipClasses[0]?.id ?? 0,
  code: "",
  name: "",
  displaySequence: 0,
  isDefault: false,
  selected: false,
});
