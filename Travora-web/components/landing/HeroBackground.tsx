"use client";

import { motion } from "framer-motion";

export default function HeroBackground() {
  return (
    <>
      <motion.video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        initial={{
          opacity: 0,
          scale: 1.06,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 1.4,
        }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </motion.video>

      <motion.div
        className="absolute inset-x-0 top-0 z-[1] h-[700px]"
        style={{
          background:
            "linear-gradient(180deg,#ffffff 0%,rgba(255,255,255,0) 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
    </>
  );
}