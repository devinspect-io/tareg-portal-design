"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import LoginForm from "@/components/LoginForm";

const SPLASH_DURATION_MS = 2100;

export default function Home() {
  const [phase, setPhase] = useState<"splash" | "login">("splash");

  useEffect(() => {
    const t = setTimeout(() => setPhase("login"), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Login mounts beneath the splash so it's revealed mid-curtain-lift */}
      {phase === "login" && <LoginForm />}
      <AnimatePresence>
        {phase === "splash" && <SplashScreen onSkip={() => setPhase("login")} />}
      </AnimatePresence>
    </div>
  );
}
