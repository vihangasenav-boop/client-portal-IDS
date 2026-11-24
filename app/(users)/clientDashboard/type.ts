export type ClientModuleId = "configuration" | "reservations" | "rate" | "pos" | "finance" | "frontoffice" | "reports" | "mms" | "snc";

export interface ClientUserPayload {
  id: number;
  email: string;
  role: string;
  allowedModules: string[];
}
