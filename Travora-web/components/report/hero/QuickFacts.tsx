"use client";

import {
  Wallet,
  Plane,
  Hotel,
  CalendarCheck2,
} from "lucide-react";

interface QuickFactsProps {
  totalEstimatedCost: string;
  airline: string;
  hotelName: string;
  totalActivities: number;
}

export default function QuickFacts({
  totalEstimatedCost,
  airline,
  hotelName,
  totalActivities,
}: QuickFactsProps) {
  const facts = [
    {
      icon: Wallet,
      label: "Estimated Cost",
      value: totalEstimatedCost,
    },
    {
      icon: Plane,
      label: "Recommended Flight",
      value: airline,
    },
    {
      icon: Hotel,
      label: "Recommended Stay",
      value: hotelName,
    },
    {
      icon: CalendarCheck2,
      label: "Activities Planned",
      value: `${totalActivities}`,
    },
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-[30px] border border-[#2B3445] bg-[#2B3445] lg:grid-cols-4">
      {facts.map((fact) => {
        const Icon = fact.icon;

        return (
          <div
            key={fact.label}
            className="bg-[#151C29] px-8 py-7 transition-colors duration-300 hover:bg-[#1B2332]"
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#B8893F]/30 bg-[#B8893F]/10">
              <Icon className="h-5 w-5 text-[#D8B46A]" />
            </div>

            <p
              className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#8E97AA]"
            >
              {fact.label}
            </p>

            <h3
              className="font-serif mt-4 break-words text-[30px] leading-tight font-semibold text-[#F2ECDF]"
            >
              {fact.value}
            </h3>
          </div>
        );
      })}
    </div>
  );
}