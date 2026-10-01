"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Page-scroll indicator pinned above the header (which sits at z-40).
 * Spring-smoothed so it glides rather than tracking every scroll tick.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-[#FF6A00] via-[#FF8A3D] to-[#2E7DFF]"
    />
  );
}
