export type RoomAmenity = {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
};

export const emptyRow = (
  id: number
): RoomAmenity => ({
  id,
  code: "",
  name: "",
  isDefault: false,
  selected: false,
});