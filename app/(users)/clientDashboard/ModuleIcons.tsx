import Image from "next/image";
import { JSX } from "react";

const C = "#f05a28";

const renderImageIcon = (src: string, alt: string): JSX.Element => (
  <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      style={{ objectFit: "contain", width: "auto", height: "auto" }}
    />
  </div>
);

const icons: Record<string, JSX.Element> = {
  configuration: (
    <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
      <circle cx="24" cy="24" r="8" stroke={C} strokeWidth="2.5"/>
      <path d="M24 6v4M24 38v4M6 24h4M38 24h4" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M10.1 10.1l2.83 2.83M35.07 35.07l2.83 2.83M10.1 37.9l2.83-2.83M35.07 12.93l2.83-2.83" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="31" cy="31" r="4.5" fill="#fff" stroke={C} strokeWidth="2"/>
      <path d="M29.5 31h3M31 29.5v3" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  reservations: (
    <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
      <path d="M8 36c0-2 1.5-3 3.5-3h25c2 0 3.5 1 3.5 3" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="24" cy="22" rx="10" ry="5" stroke={C} strokeWidth="2.5"/>
      <path d="M14 22v8M34 22v8" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={C} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  rate: (
    <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
      <rect x="6" y="17" width="15" height="10" rx="2" stroke={C} strokeWidth="2.2"/>
      <rect x="27" y="17" width="15" height="10" rx="2" stroke={C} strokeWidth="2.2"/>
      <circle cx="16" cy="22" r="3" stroke={C} strokeWidth="1.8"/>
      <path d="M21 22h6" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <path d="M13 27v5M35 27v5" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 32h8M31 32h8" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 12h10" stroke={C} strokeWidth="2" strokeLinecap="round" opacity=".5"/>
    </svg>
  ),
  pos: renderImageIcon("/assets/FXPOS.png", "FX POS"),
  finance: renderImageIcon("/assets/FX-Finance.png", "FX Finance"),
  frontoffice: renderImageIcon("/assets/FXFrontDesk.png", "FX Front Desk"),
  reports: (
    <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
      <rect x="10" y="7" width="28" height="34" rx="3" stroke={C} strokeWidth="2.5"/>
      <path d="M16 17h16M16 23h16M16 29h10" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="33" cy="33" r="6" fill="#fff" stroke={C} strokeWidth="2"/>
      <path d="M31 33h4M33 31v4" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  mms: renderImageIcon("/assets/FX-Material-Management-System-5.png", "FX Material Management"),
};

export default function ModuleIcons({ id }: { id: string }) {
  return icons[id] ?? (
    <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
      <rect x="10" y="10" width="28" height="28" rx="4" stroke="#f05a28" strokeWidth="2.5"/>
    </svg>
  );
}