export const paymentTypes = [
  { value: "Cash", label: "Cash" },
  { value: "CreditCard", label: "Credit Card" },
  { value: "Cityledger", label: "City Ledger" },
  { value: "Cheque", label: "Cheque" },
] as const;

export type PaymentType = (typeof paymentTypes)[number]["value"];

export type RelationOption = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

export type PaymentInstructionRow = {
  id: number;
  code: string;
  name: string;
  nameMultilingual: string;
  displaySequence: number;
  description: string;
  revenueGroupIds: number[];
  revenueIds: number[];
  split: number;
  paymentType: PaymentType;
  transactionLimit: string;
  forcePayment: boolean;
};

export type PaymentInstructionErrors = Partial<
  Record<
    | "code"
    | "name"
    | "nameMultilingual"
    | "displaySequence"
    | "split"
    | "transactionLimit",
    string
  >
>;

export const emptyPaymentInstruction = (id: number): PaymentInstructionRow => ({
  id,
  code: "",
  name: "",
  nameMultilingual: "",
  displaySequence: 0,
  description: "",
  revenueGroupIds: [],
  revenueIds: [],
  split: 0,
  paymentType: "Cash",
  transactionLimit: "",
  forcePayment: false,
});
