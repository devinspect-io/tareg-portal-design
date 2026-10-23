"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import logo from "@/assets/logo-white-bg.png";
import RouteBackground from "@/components/RouteBackground";
import Loader from "@/components/Loader";
import LanguageToggle from "@/components/dashboard/LanguageToggle";
import { useT } from "@/lib/translations";
import { restoreSession, signIn, useSession } from "@/lib/api/session";
import { errorText } from "@/lib/api/errors";

type Status = "idle" | "loading" | "success";
type Field = "email" | "password";

const card = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.25 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1={1} y1={1} x2={23} y2={23} />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx={12} cy={12} r={3} />
        </>
      )}
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const { t, tx } = useT();
  const session = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const taglineWords = t("tagline");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState({ email: false, password: false });
  const [redirecting, setRedirecting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const shakeControls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  // Mouse-driven 3D tilt + spotlight
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotX = useMotionValue(-1000);
  const spotY = useMotionValue(-1000);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [5, -5]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-5, 5]), {
    stiffness: 120,
    damping: 18,
  });
  const spotXs = useSpring(spotX, { stiffness: 80, damping: 20 });
  const spotYs = useSpring(spotY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setWordIndex((i) => (i + 1) % taglineWords.length),
      2600,
    );
    return () => clearInterval(id);
  }, [reduceMotion, taglineWords.length]);

  // Already signed in (token still valid): skip the form.
  useEffect(() => {
    restoreSession();
  }, []);
  useEffect(() => {
    if (session.status === "signedIn" && status === "idle") router.replace("/dashboard");
  }, [session.status, status, router]);

  function handleMouseMove(e: React.MouseEvent) {
    mouseX.set(e.clientX / window.innerWidth);
    mouseY.set(e.clientY / window.innerHeight);
    spotX.set(e.clientX);
    spotY.set(e.clientY);
  }

  const expired = session.status === "signedOut" && session.expired;
  const hasError = errors.email || errors.password || Boolean(submitError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle") return;

    const missing = { email: !email.trim(), password: !password };
    if (missing.email || missing.password) {
      setErrors(missing);
      setSubmitError(null);
      shakeControls.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }

    setErrors({ email: false, password: false });
    setSubmitError(null);
    setStatus("loading");
    try {
      await signIn(email, password);
    } catch (err) {
      setStatus("idle");
      setErrors({ email: true, password: true });
      setSubmitError(errorText(err, tx));
      shakeControls.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    setStatus("success");
    // Card pulse on success
    shakeControls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.5 },
    });
    // Let the checkmark land, then show the loader and head to the dashboard
    setTimeout(() => {
      setRedirecting(true);
      setTimeout(() => router.push("/dashboard"), 700);
    }, 900);
  }

  function fieldClasses(field: Field) {
    const errored = errors[field];
    return [
      "relative rounded-lg border bg-white transition-all duration-200",
      errored
        ? "border-prime-500 ring-4 ring-prime-500/10"
        : "border-neutral-200 focus-within:border-prime-500 focus-within:ring-4 focus-within:ring-prime-500/10",
    ].join(" ");
  }

  return (
    <div
      onMouseMove={reduceMotion ? undefined : handleMouseMove}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-white to-prime-50 px-4 text-neutral-900"
    >
      <RouteBackground />

      <Link
        href="/home"
        className="absolute top-6 start-6 z-10 flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-70 sm:top-8 sm:start-8"
      >
        <Image src={logo} alt="" width={32} height={27} className="h-[27px] w-auto" />
        <span className="text-sm font-bold tracking-wide">{t("brandName")}</span>
      </Link>

      <div className="absolute top-6 end-6 z-10 sm:top-8 sm:end-8">
        <LanguageToggle />
      </div>

      {/* Blue spotlight following the cursor */}
      {!reduceMotion && (
        <motion.div
          className="pointer-events-none absolute -top-[17rem] -start-[17rem] h-[34rem] w-[34rem] rounded-full"
          style={{
            x: spotXs,
            y: spotYs,
            background:
              "radial-gradient(circle, rgba(18, 58, 130, 0.14) 0%, rgba(18, 58, 130, 0) 65%)",
          }}
        />
      )}

      {/* Shake wrapper — controls replay the animation on repeated failures without remounting */}
      <motion.div
        animate={shakeControls}
        className="relative w-full max-w-[420px]"
      >
        <motion.div
          variants={card}
          initial="hidden"
          animate="visible"
          style={
            reduceMotion
              ? undefined
              : { rotateX, rotateY, transformPerspective: 1200 }
          }
          className={`relative rounded-2xl border border-prime-100 bg-white p-8 shadow-[0_20px_60px_-15px_rgba(10,86,224,0.25)] will-change-transform ${
            status === "success" ? "ring-4 ring-prime-500/20" : ""
          }`}
        >
          <motion.div variants={item} className="flex justify-center">
            <Image src={logo} alt="" width={54} height={46} className="h-[46px] w-auto" priority />
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-4 text-center text-2xl font-bold text-neutral-900"
          >
            {t("welcomeBackTo")} <span className="text-prime-600">{t("brandName")}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-1 text-center text-sm text-neutral-500"
          >
            {t("visibilityFor")}{" "}
            <span className="inline-block w-20 text-start align-baseline">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={taglineWords[wordIndex]}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="inline-block font-semibold text-prime-600"
                >
                  {taglineWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <motion.div variants={item}>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                {t("email")}
              </label>
              <div className={fieldClasses("email")}>
                <input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@montaka.sa"
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: false }));
                    setSubmitError(null);
                  }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                />
                <motion.div
                  className="absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-prime-500"
                  initial={false}
                  animate={{ scaleX: focusedField === "email" ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            <motion.div variants={item}>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                {t("password")}
              </label>
              <div className={fieldClasses("password")}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: false }));
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent px-4 py-3 pe-12 text-sm outline-none placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPassword ? "off" : "on"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="block"
                    >
                      <EyeIcon off={showPassword} />
                    </motion.span>
                  </AnimatePresence>
                </button>
                <motion.div
                  className="absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-prime-500"
                  initial={false}
                  animate={{ scaleX: focusedField === "password" ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            <AnimatePresence>
              {hasError && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden text-sm text-prime-600"
                >
                  {submitError ?? t("formError")}
                </motion.p>
              )}
              {!hasError && expired && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden text-sm text-neutral-500"
                >
                  {tx({ en: "Your session ended. Sign in again to continue.", ar: "انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة." })}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              variants={item}
              className="flex items-center justify-between text-sm"
            >
              <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded accent-prime-600"
                />
                {t("rememberMe")}
              </label>
              <a
                href="#"
                className="font-medium text-prime-600 transition-colors hover:text-prime-700"
              >
                {t("forgotPassword")}
              </a>
            </motion.div>

            <motion.div variants={item}>
              <motion.button
                type="submit"
                disabled={status !== "idle"}
                aria-busy={status === "loading"}
                whileHover={status === "idle" ? { scale: 1.02 } : undefined}
                whileTap={status === "idle" ? { scale: 0.97 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                animate={{
                  backgroundColor: status === "success" ? "#171717" : "#123a82",
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {status === "idle" && (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {t("signIn")}
                    </motion.span>
                  )}
                  {status === "loading" && (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      <Loader size={16} className="text-white" />
                      {t("signingIn")}
                    </motion.span>
                  )}
                  {status === "success" && (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      <svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <motion.path
                          d="M4 12l5 5L20 6"
                          stroke="white"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{
                            duration: 0.4,
                            ease: "easeOut",
                            delay: 0.1,
                          }}
                        />
                      </svg>
                      {t("welcomeBack")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          <motion.p
            variants={item}
            className="mt-6 text-center text-sm text-neutral-500"
          >
            {t("noAccount")}{" "}
            <a
              href="#"
              className="font-medium text-prime-600 transition-colors hover:text-prime-700"
            >
              {t("contactDispatch")}
            </a>
          </motion.p>

        </motion.div>
      </motion.div>

      {/* Full-screen gear loader while "redirecting" after login */}
      <AnimatePresence>
        {redirecting && (
          <Loader fullScreen label={t("redirecting")} />
        )}
      </AnimatePresence>
    </div>
  );
}
