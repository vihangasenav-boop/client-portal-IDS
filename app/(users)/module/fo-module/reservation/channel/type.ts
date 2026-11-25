export type ChannelGroup = {
  id: number;
  code: string;
  name: string;
};

export type Channel = {
  id: number;
  code: string;
  name: string;
  channelGroupId: number;
  displaySequence: number;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  channelGroupId?: string;
  displaySequence?: string;
};

export const emptyRow = (
  id: number,
  displaySequence = 1
): Channel => ({
  id,
  code: "",
  name: "",
  channelGroupId: 0,
  displaySequence,
  selected: false,
});