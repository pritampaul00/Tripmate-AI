"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function NavButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[15px] font-medium uppercase tracking-[0.04em] text-wandor-text transition-opacity hover:opacity-55"
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative flex items-center justify-between px-20 pt-6 pb-4 max-md:px-6 max-md:pt-5"
    >
      <Link
        href="/"
        className="select-none font-display text-[40px] leading-none text-black max-md:text-[32px]"
      >
        Travora
      </Link>

      <div className="absolute left-1/2 hidden -translate-x-1/2 gap-8 md:flex">
        <NavButton href="#discover">Discover</NavButton>
        <NavButton href="#pricing">Pricing</NavButton>
        <NavButton href="#faq">FAQs</NavButton>
      </div>

      <div className="flex items-center gap-8">
        <Link
          href="/login"
          className="hidden text-[15px] font-semibold uppercase tracking-[0.04em] text-[#292929] transition-opacity hover:opacity-55 md:block"
        >
          Login
        </Link>

        <Link
          href="/planner"
          className="rounded-full bg-wandor-dark px-5 py-3.5 text-[15px] font-medium uppercase tracking-[0.04em] text-[#fafafa] transition-all hover:bg-[#333] active:scale-95"
        >
          Plan My Trip
        </Link>
      </div>
    </motion.nav>
  );
}