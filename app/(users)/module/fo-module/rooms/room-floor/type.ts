export type RoomFloor = {
  id: number;
  floorCode: string;
  floorName: string;
  isDefault: boolean;
  selected: boolean;
};

export type RowErrors = {
  floorCode?: string;
  floorName?: string;
};

export const emptyRow = (id: number): RoomFloor => ({
  id,
  floorCode: "",
  floorName: "",
  isDefault: false,
  selected: false,
});