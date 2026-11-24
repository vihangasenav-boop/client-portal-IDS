export type Offer = {
  id: number;
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  selected: boolean;
};

export type RowErrors = {
  code?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

export function emptyOffer(id: number): Offer {
  return {
    id,
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    selected: false,
  };
}
