"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import type { TripDay } from "@/types/trip-plan";

import DayAccordion from "./DayAccordion";

interface DailyTimelineProps {
  dailyPlans: TripDay[];
}

export default function DailyTimeline({
  dailyPlans,
}: DailyTimelineProps) {
  const [openDay, setOpenDay] = useState(
    dailyPlans.length
      ? dailyPlans[0].day
      : -1,
  );

  const handleToggle = (day: number) => {
    setOpenDay((prev) =>
      prev === day ? -1 : day,
    );
  };

  if (!dailyPlans.length) {
    return (
      <section className="py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">
            No daily itinerary is available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10">
      <div className="space-y-4">
        {dailyPlans.map((plan, index) => (
          <motion.div
            key={plan.day}
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              delay: index * 0.08,
              duration: 0.4,
            }}
          >
            <DayAccordion
              plan={plan}
              isOpen={openDay === plan.day}
              onToggle={() =>
                handleToggle(plan.day)
              }
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}