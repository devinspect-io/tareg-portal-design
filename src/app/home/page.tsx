"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import HomePage from "@/components/marketing/HomePage";

const SPLASH_DURATION_MS = 2100;

export default function Home() {
  const [phase, setPhase] = useState<"splash" | "home">("splash");

  useEffect(() => {
    const t = setTimeout(() => setPhase("home"), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Home mounts beneath the splash so its content is revealed mid-curtain-lift */}
      {phase === "home" && <HomePage />}
      <AnimatePresence>
        {phase === "splash" && (
          <SplashScreen onSkip={() => setPhase("home")} />
        )}
      </AnimatePresence>
    </div>
  );
}
