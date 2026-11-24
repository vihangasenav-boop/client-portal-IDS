export type RoomFeature = {
  id: number;
  code: string;
  name: string;
};

export type RoomAmenity = {
  id: number;
  code: string;
  name: string;
};

export type RoomType = {
  id: number;

  classification: string;
  code: string;
  name: string;

  upgradeLevel: number;
  displaySequence: number;

  isDefault: boolean;
  description: string;
  overBooking: number;

  roomFeatureIds: number[];
  roomAmenityIds: number[];

  selected: boolean;
};

export type RowErrors = {
  classification?: string;
  code?: string;
  name?: string;
  isDefault?: string;
  upgradeLevel?: string;
  displaySequence?: string;
  overBooking?: string;
};

export const emptyRow = (
  id: number
): RoomType => ({
  id,
  classification: "Room",
  code: "",
  name: "",
  upgradeLevel: 0,
  displaySequence: 0,
  isDefault: false,
  description: "",
  overBooking: 0,
  roomFeatureIds: [],
  roomAmenityIds: [],
  selected: false,
});