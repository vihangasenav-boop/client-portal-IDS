import { FXModule } from "./types";

export const FX_MODULES: FXModule[] = [
  { id: "configuration", label: "FX Configuration",  href: "/dashboard/configuration" },
  { id: "reservations",  label: "FX Reservations",   href: "/dashboard/reservations", badge: "FOM" },
  { id: "rate",          label: "FX Rate",            href: "/dashboard/rate" },
  { id: "pos",           label: "FX POS",             href: "/dashboard/pos" },
  { id: "finance",       label: "FX Finance",         href: "/dashboard/finance" },
  { id: "frontoffice",   label: "FX Front Office",    href: "/module/fo-module" },
  { id: "reports",       label: "FX Reports",         href: "/dashboard/reports" },
  { id: "mms",           label: "FX MMS",             href: "/dashboard/mms" },
];
