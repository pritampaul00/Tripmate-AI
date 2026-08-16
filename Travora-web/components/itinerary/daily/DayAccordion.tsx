"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Wallet } from "lucide-react";

import type { TripDay } from "@/types/trip-plan";

import ActivityCard from "./ActivityCard";

interface DayAccordionProps {
  plan: TripDay;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DayAccordion({
  plan,
  isOpen,
  onToggle,
}: DayAccordionProps) {
  const firstActivity = plan.activities[0];

  return (
    <motion.div
      layout
      whileHover={{
        y: -2,
      }}
      animate={{
        backgroundColor: isOpen
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
      }}
      transition={{
        duration: 0.25,
      }}
      className="
        overflow-hidden
        rounded-[28px]
        border
        border-white/10
      "
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full
          cursor-pointer
          p-8
          text-left
          transition-all
          duration-300
          hover:bg-white/[0.03]
          ${
            isOpen
              ? "border-b border-white/10"
              : ""
          }
        `}
      >
        <div className="flex items-center justify-between gap-6">
          {/* Left */}
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#d9b276]">
              Day {plan.day}
            </span>

            <h3 className="mt-2 font-serif text-3xl font-semibold text-white">
              {plan.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/60">
              <span>
                {plan.activities.length} Activities
              </span>

              {firstActivity && (
                <>
                  <span>•</span>

                  <span>
                    Starts {firstActivity.time}
                  </span>

                  <span>•</span>

                  <span>
                    {firstActivity.title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-right sm:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
                Est. Spend
              </p>

              <div className="mt-1 flex items-center justify-end gap-2">
                <Wallet className="h-4 w-4 text-[#d9b276]" />

                <span className="font-mono text-xl font-semibold text-[#d9b276]">
                  ${plan.subtotal}
                </span>
              </div>
            </div>

            <motion.div
              animate={{
                rotate: isOpen ? 180 : 0,
              }}
              transition={{
                duration: 0.25,
              }}
              className="rounded-full border border-white/10 bg-white/5 p-3"
            >
              <ChevronDown className="h-5 w-5 text-white/70" />
            </motion.div>
          </div>
        </div>

        {/* Mobile spend */}
        <div className="mt-5 flex items-center justify-between sm:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Estimated Spend
          </span>

          <span className="font-mono text-sm font-semibold text-[#d9b276]">
            ${plan.subtotal}
          </span>
        </div>
      </button>

      {/* Activities */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            layout
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.35,
              ease: "easeInOut",
            }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-8">
              {plan.activities.map(
                (activity, index) => (
                  <ActivityCard
                    key={`${plan.day}-${activity.time}-${activity.title}-${index}`}
                    activity={activity}
                    isLast={
                      index ===
                      plan.activities.length - 1
                    }
                  />
                ),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}