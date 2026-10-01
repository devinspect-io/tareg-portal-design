"use client";

import { useLanguage } from "@/lib/useLanguage";

/** Shared shape both locales must satisfy, declared explicitly so `t()` can
 *  return the right type per key instead of a giant union of every value. */
interface Translations {
  brandName: string;
  brandSub: string;
  welcomeBackTo: string;
  visibilityFor: string;
  tagline: string[];
  email: string;
  password: string;
  rememberMe: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  welcomeBack: string;
  noAccount: string;
  contactDispatch: string;
  formError: string;
  redirecting: string;
  version: string;
  superAdmin: string;
  toggleMenu: string;
  showPassword: string;
  hidePassword: string;
  switchToEnglish: string;
  switchToArabic: string;
  splashTagline: string;
}

/**
 * Minimal i18n dictionary. Scoped to the screens that are actually
 * language-aware today (login + the dashboard topbar/language toggle) —
 * the rest of the dashboard stays English until a full pass translates it.
 * Add new keys to Translations above, then both locales here.
 */
const dict: Record<"en" | "ar", Translations> = {
  en: {
    brandName: "Tareg",
    brandSub: "Tareg Logistics",
    welcomeBackTo: "Welcome back to",
    visibilityFor: "Real-time visibility for your",
    tagline: ["shipment", "route", "fleet", "cargo", "delivery"],
    email: "Email",
    password: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in…",
    welcomeBack: "Welcome back",
    noAccount: "Don't have an account?",
    contactDispatch: "Contact dispatch",
    formError: "Please enter your email and password.",
    redirecting: "Getting you on the road…",
    version: "Version",
    superAdmin: "Super Admin",
    toggleMenu: "Toggle menu",
    showPassword: "Show password",
    hidePassword: "Hide password",
    switchToEnglish: "Switch to English",
    switchToArabic: "التبديل إلى العربية",
    splashTagline: "Speed. Precision. Delivered.",
  },
  ar: {
    brandName: "طارق",
    brandSub: "طارق للخدمات اللوجستية",
    welcomeBackTo: "مرحبًا بعودتك إلى",
    visibilityFor: "رؤية فورية لعمليات",
    tagline: ["الشحنات", "الطريق", "الأسطول", "البضائع", "التوصيل"],
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول…",
    welcomeBack: "مرحبًا بعودتك",
    noAccount: "ليس لديك حساب؟",
    contactDispatch: "تواصل مع قسم التوزيع",
    formError: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
    redirecting: "جارٍ تجهيز رحلتك…",
    version: "الإصدار",
    superAdmin: "المسؤول العام",
    toggleMenu: "تبديل القائمة",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    switchToEnglish: "Switch to English",
    switchToArabic: "التبديل إلى العربية",
    splashTagline: "سرعة. دقة. وصول.",
  },
};

export type TranslationKey = keyof Translations;

/** `const { t, language } = useT();` — `t("signIn")` reads from the current language. */
export function useT() {
  const { language } = useLanguage();
  const t = <K extends TranslationKey>(key: K): Translations[K] => dict[language][key];
  return { t, language };
}
