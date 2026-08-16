"use client";

import { ReactNode } from "react";

interface ReportSectionProps {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function ReportSection({
  number,
  title,
  description,
  children,
}: ReportSectionProps) {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1040px] px-7">
        <div className="mb-[26px] flex items-baseline gap-[14px]">
          <span className="font-mono text-xs tracking-[0.1em] text-[#d9b276]">
            {String(number).padStart(2, "0")}
          </span>

          <h2 className="font-serif text-[30px] font-semibold text-[#f2ecdf]">
            {title}
          </h2>

          <div className="h-px flex-1 bg-[rgba(232,225,210,0.14)]" />
        </div>

        {description && (
          <p className="mb-6 max-w-2xl text-sm leading-7 text-[#98a1b3]">
            {description}
          </p>
        )}

        <div className="w-full">
          {children}
        </div>
      </div>
    </section>
  );
}