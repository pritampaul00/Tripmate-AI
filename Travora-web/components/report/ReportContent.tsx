"use client";

import { ReactNode } from "react";

interface ReportContentProps {
  children: ReactNode;
}

export default function ReportContent({
  children,
}: ReportContentProps) {
  return (
    <div>
      {children}
    </div>
  );
}