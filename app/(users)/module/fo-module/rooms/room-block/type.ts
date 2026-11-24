export type RoomBlock = {
  id: number;
  blockCode: string;
  blockName: string;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  blockCode?: string;
  blockName?: string;
};

export const emptyRow = (
  id: number
): RoomBlock => ({
  id,
  blockCode: "",
  blockName: "",
  isDefault: false,
  selected: false,
});