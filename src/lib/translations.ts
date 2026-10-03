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
  logout: string;
  loadingDashboard: string;
  opening: string;
  notifications: string;
  filter: string;
  clear: string;
  viewAll: string;
  quickActions: string;
  comingSoonTitle: string;
  comingSoonBody: string;
  backToDashboard: string;
  export: string;
  search: string;
  addNew: string;
}

/**
 * Fixed UI strings. Add new keys to Translations above, then both locales
 * here. Mock/business data carries its own `Bi` pairs instead (see fleet-data)
 * and is read with `tx()`.
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
    logout: "Logout",
    loadingDashboard: "Loading your dashboard…",
    opening: "Opening",
    notifications: "Notifications",
    filter: "Filter",
    clear: "Clear",
    viewAll: "View all",
    quickActions: "Quick Actions",
    comingSoonTitle: "Coming Soon",
    comingSoonBody: "This section is being built and will be available soon.",
    backToDashboard: "Back to Dashboard",
    export: "Export",
    search: "Search",
    addNew: "Add new",
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
    logout: "تسجيل الخروج",
    loadingDashboard: "جارٍ تحميل لوحة التحكم…",
    opening: "جارٍ فتح",
    notifications: "الإشعارات",
    filter: "تصفية",
    clear: "مسح",
    viewAll: "عرض الكل",
    quickActions: "إجراءات سريعة",
    comingSoonTitle: "قريبًا",
    comingSoonBody: "هذا القسم قيد التطوير وسيكون متاحًا قريبًا.",
    backToDashboard: "العودة إلى لوحة التحكم",
    export: "تصدير",
    search: "بحث",
    addNew: "إضافة جديد",
  },
};

export type TranslationKey = keyof Translations;

/** A value in both languages, for data that isn't a fixed UI string. */
export type Bi = { en: string; ar: string };

/** `const { t, tx, language } = useT();`: `t("signIn")` for UI strings, `tx(bi)` for data. */
export function useT() {
  const { language } = useLanguage();
  const t = <K extends TranslationKey>(key: K): Translations[K] => dict[language][key];
  const tx = (value: Bi) => value[language];
  return { t, tx, language };
}
