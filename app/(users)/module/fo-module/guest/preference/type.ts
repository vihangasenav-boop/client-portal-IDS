export type Preference = {
  id: number;
  preferenceGroupId: number;
  code: string;
  name: string;
  displaySequence: number;
  isDefault: boolean;
  selected: boolean;
};

export type PreferenceGroupOption = {
  id: number;
  code: string;
  name: string;
};

export type RowErrors = {
  preferenceGroupId?: string;
  code?: string;
  name?: string;
  displaySequence?: string;
  isDefault?: string;
};

export const emptyRow = (id: number): Preference => ({
  id,
  preferenceGroupId: 0,
  code: "",
  name: "",
  displaySequence: 0,
  isDefault: false,
  selected: false,
});
