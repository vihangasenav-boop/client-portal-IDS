import type { Metadata } from "next";
import { ReactNode } from "react";
import FomSidebar from "./fo-sidebar/FoSidebar";


export const metadata: Metadata = {
  title: "FOM Module",
};

export default function FOMLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FomSidebar />

      <main className="ml-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}