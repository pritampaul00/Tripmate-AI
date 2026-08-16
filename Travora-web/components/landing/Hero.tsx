"use client";

import { motion } from "framer-motion";

import type { TripPlanResponse } from "@/types/trip-plan";

import HeroBackground from "./HeroBackground";
import Navbar from "./Navbar";
import PromptCard from "./PromptCard";

interface HeroProps {
  onTripGenerated: (response: TripPlanResponse) => void;
}

export default function Hero({
  onTripGenerated,
}: HeroProps) {
  return (
    <section className="relative">
      <HeroBackground />

      <div className="relative z-10 mx-auto flex min-h-svh max-w-[1360px] flex-col">
        <Navbar />

        <main className="flex flex-1 flex-col items-center justify-start px-6 pt-16 pb-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-5 max-w-[820px] text-[clamp(40px,6vw,68px)] font-medium leading-[1.05] tracking-[-0.04em] text-wandor-text"
          >
            Where will you go next?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mb-10 max-w-[500px] text-xl font-medium leading-relaxed text-wandor-muted"
          >
            Tell our AI where you're going and what you love. We'll create a
            personalized itinerary for you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <PromptCard onTripGenerated={onTripGenerated} />
          </motion.div>
        </main>
      </div>
    </section>
  );
}