"use client";

import { ReactNode } from "react";

interface ReportPageProps {
  children: ReactNode;
}

export default function ReportPage({
  children,
}: ReportPageProps) {
  return (
    <div className="min-h-screen bg-[#151C29] text-[#E8E1D2] antialiased">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#151C29]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_8%,rgba(184,137,63,0.18),transparent_45%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(161,58,46,0.12),transparent_40%)]" />
      </div>

      <main className="relative w-full">
        {children}
      </main>
    </div>
  );
}