import type { Metadata } from "next";
import { ReactNode } from "react";
import Navbar from "./navbar/Navbar";


export const metadata: Metadata = {
  title: "Client Portal",
};

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

// automaticaly when children foldre call then display childrean layouts layout is the main file
