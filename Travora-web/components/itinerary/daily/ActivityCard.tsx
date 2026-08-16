"use client";

import { motion } from "framer-motion";
import { MapPin, Wallet } from "lucide-react";

import type { TripActivity } from "@/types/trip-plan";

interface ActivityCardProps {
  activity: TripActivity;
  isLast: boolean;
}

export default function ActivityCard({
  activity,
  isLast,
}: ActivityCardProps) {
  return (
    <div className="flex gap-5">
      {/* Timeline */}
      <div className="flex w-10 shrink-0 flex-col items-center">
        <motion.div
          whileHover={{
            scale: 1.08,
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9b276]/25 bg-[#d9b276]/10 text-[#d9b276] shadow-[0_0_18px_rgba(217,178,118,0.12)]"
        >
          <span className="h-2 w-2 rounded-full bg-[#d9b276]" />
        </motion.div>

        {!isLast && (
          <div className="mt-2 w-px flex-1 bg-gradient-to-b from-[#d9b276]/25 via-white/10 to-transparent" />
        )}
      </div>

      {/* Activity */}
      <motion.div
        whileHover={{
          y: -3,
          scale: 1.01,
          borderColor: "rgba(255,255,255,.18)",
        }}
        transition={{
          duration: 0.25,
        }}
        className="
          flex-1
          rounded-[28px]
          border
          border-white/10
          bg-gradient-to-br
          from-white/[0.04]
          to-white/[0.015]
          p-6
          transition-all
          duration-300
        "
      >
        <div className="space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time */}
            <span
              className="
                rounded-full
                border
                border-white/10
                bg-white/[0.06]
                px-3
                py-1
                font-mono
                text-xs
                font-medium
                text-white
                backdrop-blur-xl
              "
            >
              {activity.time}
            </span>

            {/* Location */}
            <span
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-white/5
                bg-white/[0.03]
                px-3
                py-1
                font-mono
                text-xs
                text-white/60
              "
            >
              <MapPin className="h-3.5 w-3.5" />
              {activity.location}
            </span>

            {/* Cost */}
            <span
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-[#d9b276]/25
                bg-[#d9b276]/10
                px-3
                py-1
                font-mono
                text-xs
                text-[#d9b276]
              "
            >
              <Wallet className="h-3.5 w-3.5" />

              {activity.estimatedCost === 0
                ? "Free"
                : `$${activity.estimatedCost}`}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-serif text-2xl font-semibold tracking-tight text-white">
            {activity.title}
          </h4>

          {/* Description */}
          <p className="max-w-3xl leading-7 text-white/65">
            {activity.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}