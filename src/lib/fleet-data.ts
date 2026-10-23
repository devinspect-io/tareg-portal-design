// Navigation + mock data for the Tareg fleet portal (Tareq Al-Jaafari Contracting fleet proposal).
// Everything here is demo data until the real backend exists. Dates are
// generated relative to today so expiry/overdue states stay realistic.

import type { Bi } from "@/lib/translations";
import type { Language } from "@/lib/useLanguage";

// ---------- Helpers ----------

/** ISO date (local) `offset` days from today. Negative = in the past. */
function day(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Today's date as a local ISO string (not UTC, which can be a day off in KSA). */
export const todayISO = () => day(0);

/** Whole days from today until `iso` (negative when already past). */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

// Gregorian calendar + Latin digits in Arabic too (default ar-SA is Hijri).
const LOCALE: Record<Language, string> = { en: "en-GB", ar: "ar-u-ca-gregory-nu-latn" };

export function fmtDate(iso: string, lang: Language): string {
  // Accepts "yyyy-mm-dd" or a full ISO timestamp (API reviewedAt, lastLoginAt).
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtSAR(amount: number, lang: Language): string {
  const n = amount.toLocaleString("en-US");
  return lang === "ar" ? `${n} ر.س` : `SAR ${n}`;
}

export function fmtKm(km: number, lang: Language): string {
  const n = km.toLocaleString("en-US");
  return lang === "ar" ? `${n} كم` : `${n} km`;
}

/** "25 minutes ago" / "منذ 25 دقيقة", Latin digits in both languages. */
export function relativeTime(minutesAgo: number, lang: Language): string {
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  if (minutesAgo < 60) return rtf.format(-minutesAgo, "minute");
  if (minutesAgo < 1440) return rtf.format(-Math.round(minutesAgo / 60), "hour");
  return rtf.format(-Math.round(minutesAgo / 1440), "day");
}

/** Short month names for the last `count` months, oldest first. */
export function lastMonths(count: number, lang: Language): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(m.toLocaleDateString(LOCALE[lang], { month: "short" }));
  }
  return out;
}

// ---------- Statuses ----------

export type Tone = "good" | "warn" | "bad" | "info" | "neutral";

export const STATUS = {
  active: { tone: "good", label: { en: "Active", ar: "نشط" } },
  inactive: { tone: "neutral", label: { en: "Inactive", ar: "غير نشط" } },
  inMaintenance: { tone: "warn", label: { en: "In maintenance", ar: "في الصيانة" } },
  brokenDown: { tone: "bad", label: { en: "Broken down", ar: "معطلة" } },
  onLeave: { tone: "neutral", label: { en: "On leave", ar: "في إجازة" } },
  pending: { tone: "warn", label: { en: "Pending", ar: "قيد الانتظار" } },
  approved: { tone: "good", label: { en: "Approved", ar: "معتمد" } },
  rejected: { tone: "bad", label: { en: "Rejected", ar: "مرفوض" } },
  inReview: { tone: "info", label: { en: "In review", ar: "قيد المراجعة" } },
  open: { tone: "bad", label: { en: "Open", ar: "مفتوح" } },
  inProgress: { tone: "warn", label: { en: "In progress", ar: "قيد التنفيذ" } },
  closed: { tone: "good", label: { en: "Closed", ar: "مغلق" } },
  completed: { tone: "good", label: { en: "Completed", ar: "مكتمل" } },
  scheduled: { tone: "info", label: { en: "Scheduled", ar: "مجدول" } },
  dueSoon: { tone: "warn", label: { en: "Due soon", ar: "يستحق قريبًا" } },
  overdue: { tone: "bad", label: { en: "Overdue", ar: "متأخر" } },
  valid: { tone: "good", label: { en: "Valid", ar: "ساري" } },
  expired: { tone: "bad", label: { en: "Expired", ar: "منتهي" } },
  expiringSoon: { tone: "warn", label: { en: "Expiring soon", ar: "ينتهي قريبًا" } },
  paid: { tone: "good", label: { en: "Paid", ar: "مدفوع" } },
  unpaid: { tone: "bad", label: { en: "Unpaid", ar: "غير مدفوع" } },
} satisfies Record<string, { tone: Tone; label: Bi }>;

export type StatusCode = keyof typeof STATUS;

/** Expiry status from days left: past = expired, within 30 days = expiring soon. */
export function expiryStatus(iso: string): StatusCode {
  const left = daysUntil(iso);
  if (left < 0) return "expired";
  if (left <= 30) return "expiringSoon";
  return "valid";
}

/** Same thresholds, worded for scheduled work (maintenance due dates). */
export function dueStatus(iso: string): StatusCode {
  const left = daysUntil(iso);
  if (left < 0) return "overdue";
  if (left <= 14) return "dueSoon";
  return "scheduled";
}

// ---------- Navigation ----------

export type ModuleKey =
  | "dashboard"
  | "notifications"
  | "vehicles"
  | "drivers"
  | "assignments"
  | "mileage"
  | "maintenance"
  | "breakdowns"
  | "approvals"
  | "accidents"
  | "violations"
  | "compliance"
  | "fuel"
  | "expenses"
  | "history"
  | "reports"
  | "users"
  | "settings"
  | "ai-reporting";

export type NavItem = {
  key: ModuleKey;
  icon: string; // key into the icon map in Sidebar
  label: Bi;
  /** Kept in config (and its view still routable) but left out of the sidebar. */
  hidden?: boolean;
};

export type NavSection = { title: Bi; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: { en: "Overview", ar: "نظرة عامة" },
    items: [
      { key: "dashboard", icon: "home", label: { en: "Dashboard", ar: "لوحة التحكم" } },
      { key: "notifications", icon: "bell", label: { en: "Notifications", ar: "الإشعارات" } },
      { key: "ai-reporting", icon: "sparkles", label: { en: "AI Reporting", ar: "تقارير الذكاء الاصطناعي" }, hidden: true },
    ],
  },
  {
    title: { en: "Fleet", ar: "الأسطول" },
    items: [
      { key: "vehicles", icon: "car", label: { en: "Vehicles", ar: "المركبات" } },
      { key: "drivers", icon: "driver", label: { en: "Drivers", ar: "السائقون" } },
      { key: "assignments", icon: "link", label: { en: "Assignments", ar: "إسناد المركبات" } },
      { key: "mileage", icon: "gauge", label: { en: "Kilometer Tracking", ar: "قراءات العداد" } },
    ],
  },
  {
    title: { en: "Operations", ar: "العمليات" },
    items: [
      { key: "maintenance", icon: "wrench", label: { en: "Maintenance", ar: "الصيانة" } },
      { key: "breakdowns", icon: "breakdown", label: { en: "Breakdowns", ar: "الأعطال" } },
      { key: "approvals", icon: "approval", label: { en: "Approvals", ar: "الموافقات" } },
      { key: "accidents", icon: "accident", label: { en: "Accidents", ar: "الحوادث" } },
      { key: "violations", icon: "ticket", label: { en: "Traffic Violations", ar: "المخالفات المرورية" } },
    ],
  },
  {
    title: { en: "Compliance & Finance", ar: "الامتثال والمالية" },
    items: [
      { key: "compliance", icon: "shield", label: { en: "Compliance & Expiries", ar: "الامتثال والصلاحيات" } },
      { key: "fuel", icon: "fuel", label: { en: "Fuel Benefits", ar: "مخصصات الوقود" } },
      { key: "expenses", icon: "receipt", label: { en: "Expense Invoices", ar: "فواتير المصروفات" } },
    ],
  },
  {
    title: { en: "Records", ar: "السجلات" },
    items: [
      { key: "history", icon: "history", label: { en: "Vehicle & Driver History", ar: "سجل المركبات والسائقين" } },
      { key: "reports", icon: "chart", label: { en: "Reports", ar: "التقارير" } },
    ],
  },
  {
    title: { en: "Administration", ar: "الإدارة" },
    items: [
      { key: "users", icon: "users", label: { en: "Users & Roles", ar: "المستخدمون والصلاحيات" } },
      { key: "settings", icon: "gears", label: { en: "Settings", ar: "الإعدادات" } },
    ],
  },
];

export const MODULE_LABELS = Object.fromEntries(
  NAV_SECTIONS.flatMap((s) => s.items.map((i) => [i.key, i.label])),
) as Record<ModuleKey, Bi>;

// ---------- Drivers ----------

export type Driver = {
  id: string;
  name: Bi;
  employeeNo: string;
  phone: string;
  /** Saudi national ID (starts with 1) or Iqama (starts with 2). */
  idNumber: string;
  idType: "national" | "iqama";
  idExpiry: string;
  licenseExpiry: string;
  nationality: Bi;
  status: StatusCode;
};

export const DRIVERS: Driver[] = [
  { id: "d1", name: { en: "Mohammed Al-Otaibi", ar: "محمد العتيبي" }, employeeNo: "EMP-1042", phone: "+966 55 214 3301", idNumber: "1087462231", idType: "national", idExpiry: day(410), licenseExpiry: day(18), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d2", name: { en: "Fahad Al-Qahtani", ar: "فهد القحطاني" }, employeeNo: "EMP-1043", phone: "+966 50 774 1290", idNumber: "1093318845", idType: "national", idExpiry: day(620), licenseExpiry: day(240), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d3", name: { en: "Rajesh Kumar", ar: "راجيش كومار" }, employeeNo: "EMP-1051", phone: "+966 56 901 4427", idNumber: "2398817402", idType: "iqama", idExpiry: day(-6), licenseExpiry: day(95), nationality: { en: "Indian", ar: "هندي" }, status: "active" },
  { id: "d4", name: { en: "Abdullah Al-Shammari", ar: "عبدالله الشمري" }, employeeNo: "EMP-1056", phone: "+966 54 330 8812", idNumber: "1102284471", idType: "national", idExpiry: day(300), licenseExpiry: day(-12), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d5", name: { en: "Muhammad Arif", ar: "محمد عارف" }, employeeNo: "EMP-1060", phone: "+966 59 118 6603", idNumber: "2411902237", idType: "iqama", idExpiry: day(22), licenseExpiry: day(180), nationality: { en: "Pakistani", ar: "باكستاني" }, status: "active" },
  { id: "d6", name: { en: "Khalid Al-Harbi", ar: "خالد الحربي" }, employeeNo: "EMP-1064", phone: "+966 53 662 0941", idNumber: "1078812290", idType: "national", idExpiry: day(500), licenseExpiry: day(410), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d7", name: { en: "Joseph Mathew", ar: "جوزيف ماثيو" }, employeeNo: "EMP-1071", phone: "+966 57 245 7718", idNumber: "2367740193", idType: "iqama", idExpiry: day(140), licenseExpiry: day(27), nationality: { en: "Indian", ar: "هندي" }, status: "active" },
  { id: "d8", name: { en: "Saud Al-Dosari", ar: "سعود الدوسري" }, employeeNo: "EMP-1075", phone: "+966 55 870 3324", idNumber: "1110093381", idType: "national", idExpiry: day(720), licenseExpiry: day(560), nationality: { en: "Saudi", ar: "سعودي" }, status: "onLeave" },
  { id: "d9", name: { en: "Ahmed Hassan", ar: "أحمد حسن" }, employeeNo: "EMP-1080", phone: "+966 50 339 5560", idNumber: "2450177826", idType: "iqama", idExpiry: day(11), licenseExpiry: day(300), nationality: { en: "Egyptian", ar: "مصري" }, status: "active" },
  { id: "d10", name: { en: "Yasser Al-Zahrani", ar: "ياسر الزهراني" }, employeeNo: "EMP-1084", phone: "+966 56 412 9937", idNumber: "1098834402", idType: "national", idExpiry: day(390), licenseExpiry: day(210), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d11", name: { en: "Nasser Al-Mutairi", ar: "ناصر المطيري" }, employeeNo: "EMP-1089", phone: "+966 54 781 2265", idNumber: "1105526718", idType: "national", idExpiry: day(260), licenseExpiry: day(75), nationality: { en: "Saudi", ar: "سعودي" }, status: "active" },
  { id: "d12", name: { en: "Ramon Santos", ar: "رامون سانتوس" }, employeeNo: "EMP-1093", phone: "+966 59 664 0172", idNumber: "2389015544", idType: "iqama", idExpiry: day(330), licenseExpiry: day(150), nationality: { en: "Filipino", ar: "فلبيني" }, status: "inactive" },
];

// ---------- Vehicles ----------

export type Vehicle = {
  id: string;
  plate: string;
  make: Bi;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  driverId: string | null;
  city: Bi;
  status: StatusCode;
  registrationExpiry: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
};

const RIYADH: Bi = { en: "Riyadh", ar: "الرياض" };
const DAMMAM: Bi = { en: "Dammam", ar: "الدمام" };
const JEDDAH: Bi = { en: "Jeddah", ar: "جدة" };
const KHOBAR: Bi = { en: "Al Khobar", ar: "الخبر" };
const TOYOTA: Bi = { en: "Toyota", ar: "تويوتا" };
const HYUNDAI: Bi = { en: "Hyundai", ar: "هيونداي" };
const ISUZU: Bi = { en: "Isuzu", ar: "إيسوزو" };
const NISSAN: Bi = { en: "Nissan", ar: "نيسان" };
const MITSUBISHI: Bi = { en: "Mitsubishi", ar: "ميتسوبيشي" };

export const VEHICLES: Vehicle[] = [
  { id: "v1", plate: "RJA 4821", make: TOYOTA, model: "Hilux", year: 2023, vin: "MR0FA3CD8P0412873", mileage: 48210, driverId: "d1", city: RIYADH, status: "active", registrationExpiry: day(210), insuranceExpiry: day(25), inspectionExpiry: day(140) },
  { id: "v2", plate: "KSB 7314", make: TOYOTA, model: "Land Cruiser", year: 2022, vin: "JTMHV09J804091265", mileage: 91540, driverId: "d2", city: RIYADH, status: "active", registrationExpiry: day(330), insuranceExpiry: day(190), inspectionExpiry: day(-4) },
  { id: "v3", plate: "DMM 2290", make: HYUNDAI, model: "H1", year: 2021, vin: "KMJWA37KAMU284516", mileage: 132880, driverId: "d3", city: DAMMAM, status: "inMaintenance", registrationExpiry: day(80), insuranceExpiry: day(260), inspectionExpiry: day(55) },
  { id: "v4", plate: "LRA 1187", make: ISUZU, model: "NPR", year: 2020, vin: "JALC4W166L7008315", mileage: 176420, driverId: "d4", city: RIYADH, status: "brokenDown", registrationExpiry: day(-9), insuranceExpiry: day(120), inspectionExpiry: day(35) },
  { id: "v5", plate: "JED 5562", make: NISSAN, model: "Patrol", year: 2024, vin: "JN8AY2NY4R9071184", mileage: 21330, driverId: "d5", city: JEDDAH, status: "active", registrationExpiry: day(500), insuranceExpiry: day(300), inspectionExpiry: day(410) },
  { id: "v6", plate: "KHB 3049", make: MITSUBISHI, model: "L200", year: 2022, vin: "MMBJJKL10NH013542", mileage: 87960, driverId: "d6", city: KHOBAR, status: "active", registrationExpiry: day(150), insuranceExpiry: day(14), inspectionExpiry: day(200) },
  { id: "v7", plate: "RDA 6610", make: TOYOTA, model: "Corolla", year: 2023, vin: "JTDBR3FE5P3071206", mileage: 39870, driverId: "d7", city: RIYADH, status: "active", registrationExpiry: day(260), insuranceExpiry: day(240), inspectionExpiry: day(90) },
  { id: "v8", plate: "DMB 8823", make: TOYOTA, model: "Hiace", year: 2021, vin: "JTFSS22P2M0193374", mileage: 118650, driverId: "d8", city: DAMMAM, status: "inactive", registrationExpiry: day(40), insuranceExpiry: day(-2), inspectionExpiry: day(160) },
  { id: "v9", plate: "JDA 4475", make: HYUNDAI, model: "Accent", year: 2024, vin: "KMHCT41DAR1054478", mileage: 17240, driverId: "d9", city: JEDDAH, status: "active", registrationExpiry: day(600), insuranceExpiry: day(420), inspectionExpiry: day(380) },
  { id: "v10", plate: "RKB 9302", make: ISUZU, model: "D-Max", year: 2023, vin: "MPATFS86JPT006731", mileage: 56110, driverId: "d10", city: RIYADH, status: "active", registrationExpiry: day(29), insuranceExpiry: day(310), inspectionExpiry: day(120) },
  { id: "v11", plate: "KHA 7128", make: TOYOTA, model: "Hilux", year: 2021, vin: "MR0HA3CD1M0305587", mileage: 143200, driverId: "d11", city: KHOBAR, status: "inMaintenance", registrationExpiry: day(190), insuranceExpiry: day(85), inspectionExpiry: day(8) },
  { id: "v12", plate: "RJB 2054", make: NISSAN, model: "Sunny", year: 2022, vin: "MDHBN7AD4N0412290", mileage: 64380, driverId: null, city: RIYADH, status: "inactive", registrationExpiry: day(270), insuranceExpiry: day(230), inspectionExpiry: day(310) },
];

export const vehicleById = (id: string | null) => VEHICLES.find((v) => v.id === id);
export const driverById = (id: string | null) => DRIVERS.find((d) => d.id === id);
export const vehicleOfDriver = (driverId: string) => VEHICLES.find((v) => v.driverId === driverId);

// ---------- Assignments ----------

export type Assignment = { vehicleId: string; driverId: string; from: string; to: string | null };

export const ASSIGNMENTS: Assignment[] = [
  ...VEHICLES.filter((v) => v.driverId).map((v, i) => ({
    vehicleId: v.id,
    driverId: v.driverId as string,
    from: day(-40 - i * 23),
    to: null,
  })),
  { vehicleId: "v12", driverId: "d12", from: day(-420), to: day(-35) },
  { vehicleId: "v3", driverId: "d10", from: day(-610), to: day(-300) },
  { vehicleId: "v1", driverId: "d6", from: day(-500), to: day(-41) },
];

// ---------- Kilometer submissions ----------

export type MileageSubmission = {
  id: string;
  date: string;
  driverId: string;
  vehicleId: string;
  previous: number;
  reading: number;
  photos: number;
  status: StatusCode;
};

export const MILEAGE: MileageSubmission[] = [
  { id: "KM-3318", date: day(0), driverId: "d1", vehicleId: "v1", previous: 47390, reading: 48210, photos: 2, status: "pending" },
  { id: "KM-3317", date: day(0), driverId: "d5", vehicleId: "v5", previous: 20660, reading: 21330, photos: 1, status: "pending" },
  { id: "KM-3316", date: day(-1), driverId: "d9", vehicleId: "v9", previous: 16590, reading: 17240, photos: 1, status: "approved" },
  { id: "KM-3315", date: day(-1), driverId: "d2", vehicleId: "v2", previous: 90480, reading: 91540, photos: 2, status: "approved" },
  { id: "KM-3314", date: day(-2), driverId: "d6", vehicleId: "v6", previous: 87110, reading: 87960, photos: 1, status: "inReview" },
  { id: "KM-3313", date: day(-3), driverId: "d7", vehicleId: "v7", previous: 39020, reading: 39870, photos: 2, status: "approved" },
  { id: "KM-3312", date: day(-4), driverId: "d10", vehicleId: "v10", previous: 55240, reading: 56110, photos: 1, status: "approved" },
  { id: "KM-3311", date: day(-6), driverId: "d11", vehicleId: "v11", previous: 142350, reading: 143200, photos: 1, status: "rejected" },
];

/** Total km driven per month, last 6 months (oldest first). */
export const MONTHLY_KM = [38400, 41250, 39880, 44620, 43170, 46930];

// ---------- Maintenance ----------

export type ScheduledMaintenance = { vehicleId: string; task: Bi; dueDate: string; dueKm: number };

export const SCHEDULED_MAINTENANCE: ScheduledMaintenance[] = [
  { vehicleId: "v2", task: { en: "Periodic service (90,000 km)", ar: "صيانة دورية (90,000 كم)" }, dueDate: day(-3), dueKm: 90000 },
  { vehicleId: "v1", task: { en: "Oil & filter change", ar: "تغيير الزيت والفلتر" }, dueDate: day(4), dueKm: 50000 },
  { vehicleId: "v6", task: { en: "Brake inspection", ar: "فحص الفرامل" }, dueDate: day(9), dueKm: 90000 },
  { vehicleId: "v10", task: { en: "Tire rotation", ar: "تدوير الإطارات" }, dueDate: day(12), dueKm: 57500 },
  { vehicleId: "v7", task: { en: "Periodic service (40,000 km)", ar: "صيانة دورية (40,000 كم)" }, dueDate: day(20), dueKm: 40000 },
  { vehicleId: "v9", task: { en: "Oil & filter change", ar: "تغيير الزيت والفلتر" }, dueDate: day(33), dueKm: 20000 },
  { vehicleId: "v5", task: { en: "Battery check", ar: "فحص البطارية" }, dueDate: day(45), dueKm: 25000 },
];

export type MaintenanceRecord = {
  id: string;
  date: string;
  vehicleId: string;
  type: Bi;
  vendor: Bi;
  cost: number;
  emergency: boolean;
  status: StatusCode;
};

const WS_NUKHBA: Bi = { en: "Al-Nukhba Auto Workshop", ar: "ورشة النخبة للسيارات" };
const WS_TIRES: Bi = { en: "Al-Wafa Tires & Batteries", ar: "الوفاء للإطارات والبطاريات" };
const WS_AGENCY: Bi = { en: "Authorized Dealer Service Center", ar: "مركز خدمة الوكيل المعتمد" };

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: "MNT-2207", date: day(-1), vehicleId: "v3", type: { en: "Gearbox repair", ar: "إصلاح ناقل الحركة" }, vendor: WS_NUKHBA, cost: 6850, emergency: true, status: "inProgress" },
  { id: "MNT-2206", date: day(-2), vehicleId: "v11", type: { en: "Periodic service (140,000 km)", ar: "صيانة دورية (140,000 كم)" }, vendor: WS_AGENCY, cost: 1420, emergency: false, status: "inProgress" },
  { id: "MNT-2205", date: day(-5), vehicleId: "v6", type: { en: "Battery replacement", ar: "تغيير البطارية" }, vendor: WS_TIRES, cost: 540, emergency: false, status: "completed" },
  { id: "MNT-2204", date: day(-8), vehicleId: "v2", type: { en: "Tire replacement (x4)", ar: "تغيير الإطارات (4)" }, vendor: WS_TIRES, cost: 3360, emergency: false, status: "completed" },
  { id: "MNT-2203", date: day(-12), vehicleId: "v4", type: { en: "Radiator repair", ar: "إصلاح الرادياتير" }, vendor: WS_NUKHBA, cost: 1980, emergency: true, status: "completed" },
  { id: "MNT-2202", date: day(-19), vehicleId: "v7", type: { en: "Oil & filter change", ar: "تغيير الزيت والفلتر" }, vendor: WS_AGENCY, cost: 380, emergency: false, status: "completed" },
  { id: "MNT-2201", date: day(-26), vehicleId: "v1", type: { en: "Brake pads replacement", ar: "تغيير فحمات الفرامل" }, vendor: WS_NUKHBA, cost: 760, emergency: false, status: "completed" },
];

/** Monthly maintenance spend, last 6 months: scheduled vs emergency (SAR). */
export const MAINTENANCE_COST = {
  scheduled: [7200, 6400, 8100, 5900, 7600, 6980],
  emergency: [2100, 4800, 1500, 6200, 3300, 8830],
};

// ---------- Breakdowns ----------

export type Breakdown = {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  location: Bi;
  description: Bi;
  major: boolean;
  status: StatusCode;
};

export const BREAKDOWNS: Breakdown[] = [
  { id: "BRK-0418", date: day(0), vehicleId: "v4", driverId: "d4", location: { en: "King Fahd Rd, Riyadh", ar: "طريق الملك فهد، الرياض" }, description: { en: "Engine overheating, towed to workshop", ar: "ارتفاع حرارة المحرك، تم سحبها إلى الورشة" }, major: true, status: "open" },
  { id: "BRK-0417", date: day(-1), vehicleId: "v3", driverId: "d3", location: { en: "Dammam–Khobar Hwy", ar: "طريق الدمام – الخبر" }, description: { en: "Gearbox slipping in 3rd gear", ar: "انزلاق في ناقل الحركة على الغيار الثالث" }, major: true, status: "inProgress" },
  { id: "BRK-0416", date: day(-4), vehicleId: "v10", driverId: "d10", location: { en: "Exit 9, Riyadh", ar: "مخرج 9، الرياض" }, description: { en: "Flat tire, replaced on site", ar: "إطار مثقوب، تم تغييره في الموقع" }, major: false, status: "closed" },
  { id: "BRK-0415", date: day(-15), vehicleId: "v4", driverId: "d4", location: { en: "Industrial Area 2, Riyadh", ar: "المنطقة الصناعية الثانية، الرياض" }, description: { en: "Radiator leak", ar: "تسريب في الرادياتير" }, major: true, status: "closed" },
];

// ---------- Approvals ----------

export type ApprovalStep = { role: Bi; state: "done" | "current" | "waiting" | "rejected" };

export type Approval = {
  id: string;
  date: string;
  type: Bi;
  driverId: string;
  vehicleId: string;
  amount: number;
  note: Bi;
  steps: ApprovalStep[];
  status: StatusCode;
};

const R_DRIVER: Bi = { en: "Driver", ar: "السائق" };
const R_ASSISTANT: Bi = { en: "Assistant", ar: "المساعد" };
const R_FLEET: Bi = { en: "Fleet Manager", ar: "مدير الأسطول" };

export const APPROVALS: Approval[] = [
  { id: "APR-1129", date: day(0), type: { en: "Maintenance request", ar: "طلب صيانة" }, driverId: "d1", vehicleId: "v1", amount: 1250, note: { en: "Grinding noise when braking", ar: "صوت احتكاك عند الفرملة" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "current" }, { role: R_FLEET, state: "waiting" }], status: "pending" },
  { id: "APR-1128", date: day(0), type: { en: "Emergency repair", ar: "إصلاح طارئ" }, driverId: "d4", vehicleId: "v4", amount: 4300, note: { en: "Engine overheating, needs radiator and pump", ar: "ارتفاع حرارة المحرك، يحتاج رادياتير ومضخة" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "done" }, { role: R_FLEET, state: "current" }], status: "pending" },
  { id: "APR-1127", date: day(-1), type: { en: "Tire replacement", ar: "تغيير الإطارات" }, driverId: "d6", vehicleId: "v6", amount: 1680, note: { en: "Rear tires worn below limit", ar: "الإطارات الخلفية متآكلة دون الحد المسموح" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "current" }, { role: R_FLEET, state: "waiting" }], status: "pending" },
  { id: "APR-1126", date: day(-1), type: { en: "Battery replacement", ar: "تغيير البطارية" }, driverId: "d9", vehicleId: "v9", amount: 520, note: { en: "Weak start in the mornings", ar: "ضعف في التشغيل صباحًا" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "done" }, { role: R_FLEET, state: "current" }], status: "pending" },
  { id: "APR-1125", date: day(-2), type: { en: "Maintenance request", ar: "طلب صيانة" }, driverId: "d3", vehicleId: "v3", amount: 6850, note: { en: "Gearbox slipping", ar: "انزلاق ناقل الحركة" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "done" }, { role: R_FLEET, state: "done" }], status: "approved" },
  { id: "APR-1124", date: day(-3), type: { en: "Expense claim", ar: "مطالبة مصروفات" }, driverId: "d7", vehicleId: "v7", amount: 230, note: { en: "Car wash and parking", ar: "غسيل ومواقف" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "rejected" }, { role: R_FLEET, state: "waiting" }], status: "rejected" },
  { id: "APR-1123", date: day(-4), type: { en: "Tire replacement", ar: "تغيير الإطارات" }, driverId: "d2", vehicleId: "v2", amount: 3360, note: { en: "All four tires", ar: "الإطارات الأربعة" }, steps: [{ role: R_DRIVER, state: "done" }, { role: R_ASSISTANT, state: "done" }, { role: R_FLEET, state: "done" }], status: "approved" },
];

// ---------- Accidents & violations ----------

/**
 * One accident photo. `damage` is where the impact is on the car (it faces
 * right): drives the marker on the drawn mock image until real uploads exist.
 */
export type AccidentPhoto = {
  kind: "scene" | "closeup" | "document";
  damage?: "front" | "rear" | "side";
  caption: Bi;
  /** Minutes after the accident the driver uploaded it from the mobile app. */
  uploadedAfter: number;
};

export type Accident = {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  location: Bi;
  description: Bi;
  /** Najm / police report reference. */
  reference: string;
  cost: number;
  status: StatusCode;
  photos: AccidentPhoto[];
};

const NAJM_DOC: AccidentPhoto = { kind: "document", caption: { en: "Najm accident report", ar: "تقرير حادث نجم" }, uploadedAfter: 95 };

export const ACCIDENTS: Accident[] = [
  { id: "ACC-0091", date: day(-2), vehicleId: "v7", driverId: "d7", location: { en: "Olaya St, Riyadh", ar: "شارع العليا، الرياض" }, description: { en: "Rear-ended at traffic light, bumper damage", ar: "اصطدام من الخلف عند الإشارة، تلف في الصدام" }, reference: "NJM-2026-481207", cost: 2400, status: "open", photos: [
    { kind: "scene", damage: "rear", caption: { en: "Rear view at the scene", ar: "منظر خلفي في موقع الحادث" }, uploadedAfter: 6 },
    { kind: "closeup", damage: "rear", caption: { en: "Rear bumper close-up", ar: "صورة مقربة للصدام الخلفي" }, uploadedAfter: 7 },
    { kind: "scene", damage: "rear", caption: { en: "Both vehicles at the light", ar: "المركبتان عند الإشارة" }, uploadedAfter: 9 },
    NAJM_DOC,
  ] },
  { id: "ACC-0090", date: day(-9), vehicleId: "v6", driverId: "d6", location: { en: "Prince Turki St, Khobar", ar: "شارع الأمير تركي، الخبر" }, description: { en: "Side mirror broken while parking", ar: "كسر المرآة الجانبية أثناء الوقوف" }, reference: "NJM-2026-466913", cost: 650, status: "inReview", photos: [
    { kind: "closeup", damage: "side", caption: { en: "Broken side mirror", ar: "المرآة الجانبية المكسورة" }, uploadedAfter: 4 },
    { kind: "scene", damage: "side", caption: { en: "Parking position", ar: "وضعية الوقوف" }, uploadedAfter: 5 },
  ] },
  { id: "ACC-0089", date: day(-34), vehicleId: "v2", driverId: "d2", location: { en: "Northern Ring Rd, Riyadh", ar: "الطريق الدائري الشمالي، الرياض" }, description: { en: "Minor collision, front fender", ar: "اصطدام بسيط، الرفرف الأمامي" }, reference: "NJM-2026-402558", cost: 3100, status: "closed", photos: [
    { kind: "scene", damage: "front", caption: { en: "Front view at the scene", ar: "منظر أمامي في موقع الحادث" }, uploadedAfter: 8 },
    { kind: "closeup", damage: "front", caption: { en: "Front fender damage", ar: "تلف الرفرف الأمامي" }, uploadedAfter: 10 },
    NAJM_DOC,
  ] },
];

export type Violation = {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  type: Bi;
  location: Bi;
  fine: number;
  status: StatusCode;
};

export const VIOLATIONS: Violation[] = [
  { id: "VIO-7731", date: day(-1), vehicleId: "v10", driverId: "d10", type: { en: "Speeding (20+ km/h over)", ar: "تجاوز السرعة (أكثر من 20 كم/س)" }, location: { en: "King Salman Rd, Riyadh", ar: "طريق الملك سلمان، الرياض" }, fine: 300, status: "unpaid" },
  { id: "VIO-7730", date: day(-3), vehicleId: "v1", driverId: "d1", type: { en: "Parking violation", ar: "مخالفة وقوف" }, location: { en: "Al Malaz, Riyadh", ar: "الملز، الرياض" }, fine: 150, status: "unpaid" },
  { id: "VIO-7729", date: day(-6), vehicleId: "v9", driverId: "d9", type: { en: "Mobile phone use while driving", ar: "استخدام الجوال أثناء القيادة" }, location: { en: "Tahlia St, Jeddah", ar: "شارع التحلية، جدة" }, fine: 500, status: "paid" },
  { id: "VIO-7728", date: day(-11), vehicleId: "v5", driverId: "d5", type: { en: "Red light", ar: "قطع الإشارة" }, location: { en: "Madinah Rd, Jeddah", ar: "طريق المدينة، جدة" }, fine: 3000, status: "unpaid" },
  { id: "VIO-7727", date: day(-17), vehicleId: "v2", driverId: "d2", type: { en: "Seatbelt not fastened", ar: "عدم ربط حزام الأمان" }, location: { en: "Exit 5, Riyadh", ar: "مخرج 5، الرياض" }, fine: 150, status: "paid" },
];

// ---------- Compliance & expiries ----------

export type ComplianceItem = {
  document: Bi;
  subject: Bi; // driver name or plate
  kind: "driver" | "vehicle";
  expiry: string;
};

/** Every tracked document, soonest expiry first. */
export function complianceItems(): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  for (const d of DRIVERS) {
    items.push({ document: { en: "Driving license", ar: "رخصة القيادة" }, subject: d.name, kind: "driver", expiry: d.licenseExpiry });
    items.push({
      document: d.idType === "iqama" ? { en: "Iqama", ar: "الإقامة" } : { en: "National ID", ar: "الهوية الوطنية" },
      subject: d.name,
      kind: "driver",
      expiry: d.idExpiry,
    });
  }
  for (const v of VEHICLES) {
    const plate = { en: v.plate, ar: v.plate };
    items.push({ document: { en: "Registration (Istimara)", ar: "الاستمارة" }, subject: plate, kind: "vehicle", expiry: v.registrationExpiry });
    items.push({ document: { en: "Insurance", ar: "التأمين" }, subject: plate, kind: "vehicle", expiry: v.insuranceExpiry });
    items.push({ document: { en: "Periodic inspection (Fahas)", ar: "الفحص الدوري" }, subject: plate, kind: "vehicle", expiry: v.inspectionExpiry });
  }
  return items.sort((a, b) => a.expiry.localeCompare(b.expiry));
}

// ---------- Fuel benefits ----------

export type FuelBenefit = { vehicleId: string; driverId: string; allocation: number; used: number; liters: number };

export const FUEL: FuelBenefit[] = [
  { vehicleId: "v1", driverId: "d1", allocation: 900, used: 742, liters: 318 },
  { vehicleId: "v2", driverId: "d2", allocation: 1200, used: 1184, liters: 508 },
  { vehicleId: "v3", driverId: "d3", allocation: 1000, used: 410, liters: 176 },
  { vehicleId: "v5", driverId: "d5", allocation: 1200, used: 865, liters: 371 },
  { vehicleId: "v6", driverId: "d6", allocation: 900, used: 905, liters: 388 },
  { vehicleId: "v7", driverId: "d7", allocation: 600, used: 388, liters: 166 },
  { vehicleId: "v9", driverId: "d9", allocation: 600, used: 451, liters: 194 },
  { vehicleId: "v10", driverId: "d10", allocation: 900, used: 690, liters: 296 },
  { vehicleId: "v11", driverId: "d11", allocation: 900, used: 520, liters: 223 },
];

// ---------- Expenses & invoices ----------

export const EXPENSE_CATEGORIES = {
  maintenance: { en: "Maintenance & repairs", ar: "الصيانة والإصلاحات" },
  fuel: { en: "Fuel", ar: "الوقود" },
  tires: { en: "Tires & batteries", ar: "الإطارات والبطاريات" },
  accident: { en: "Accident repairs", ar: "إصلاحات الحوادث" },
  fines: { en: "Traffic fines", ar: "المخالفات المرورية" },
  registration: { en: "Registration & insurance", ar: "التسجيل والتأمين" },
} satisfies Record<string, Bi>;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  vehicleId: string;
  vendor: Bi;
  amount: number;
  attachment: boolean;
  status: StatusCode;
};

export const EXPENSES: Expense[] = [
  { id: "INV-5562", date: day(-1), category: "maintenance", vehicleId: "v3", vendor: WS_NUKHBA, amount: 6850, attachment: true, status: "unpaid" },
  { id: "INV-5561", date: day(-2), category: "fuel", vehicleId: "v2", vendor: { en: "Aldrees Fuel Station", ar: "محطة الدريس" }, amount: 1184, attachment: true, status: "paid" },
  { id: "INV-5560", date: day(-2), category: "accident", vehicleId: "v7", vendor: WS_NUKHBA, amount: 2400, attachment: false, status: "unpaid" },
  { id: "INV-5559", date: day(-5), category: "tires", vehicleId: "v6", vendor: WS_TIRES, amount: 540, attachment: true, status: "paid" },
  { id: "INV-5558", date: day(-6), category: "fines", vehicleId: "v9", vendor: { en: "Traffic Department (Absher)", ar: "الإدارة العامة للمرور (أبشر)" }, amount: 500, attachment: true, status: "paid" },
  { id: "INV-5557", date: day(-8), category: "tires", vehicleId: "v2", vendor: WS_TIRES, amount: 3360, attachment: true, status: "paid" },
  { id: "INV-5556", date: day(-10), category: "registration", vehicleId: "v8", vendor: { en: "Tawuniya Insurance", ar: "التعاونية للتأمين" }, amount: 2950, attachment: true, status: "unpaid" },
  { id: "INV-5555", date: day(-12), category: "maintenance", vehicleId: "v4", vendor: WS_NUKHBA, amount: 1980, attachment: true, status: "paid" },
  { id: "INV-5554", date: day(-14), category: "fuel", vehicleId: "v5", vendor: { en: "Sasco Station", ar: "محطة ساسكو" }, amount: 865, attachment: true, status: "paid" },
  { id: "INV-5553", date: day(-19), category: "maintenance", vehicleId: "v7", vendor: WS_AGENCY, amount: 380, attachment: true, status: "paid" },
];

// ---------- Notifications ----------

export const PRIORITIES = {
  high: { tone: "bad", label: { en: "High", ar: "عالية" }, heading: { en: "High priority", ar: "أولوية عالية" } },
  medium: { tone: "warn", label: { en: "Medium", ar: "متوسطة" }, heading: { en: "Medium priority", ar: "أولوية متوسطة" } },
  low: { tone: "info", label: { en: "Low", ar: "منخفضة" }, heading: { en: "Low priority", ar: "أولوية منخفضة" } },
} satisfies Record<string, { tone: Tone; label: Bi; heading: Bi }>;

export type Priority = keyof typeof PRIORITIES;
export const PRIORITY_ORDER: Priority[] = ["high", "medium", "low"];

/** Notification categories, mirroring the proposal's functional areas. */
export const NOTIFICATION_CATEGORIES = {
  maintenance: { icon: "wrench", label: { en: "Maintenance & breakdowns", ar: "الصيانة والأعطال" } },
  approvals: { icon: "approval", label: { en: "Approvals", ar: "الموافقات" } },
  compliance: { icon: "shield", label: { en: "Compliance & expiries", ar: "الامتثال والصلاحيات" } },
  incidents: { icon: "accident", label: { en: "Accidents & violations", ar: "الحوادث والمخالفات" } },
  submissions: { icon: "gauge", label: { en: "Driver submissions", ar: "قراءات السائقين" } },
  expenses: { icon: "receipt", label: { en: "Fuel & expenses", ar: "الوقود والمصروفات" } },
} satisfies Record<string, { icon: string; label: Bi }>;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

export type FleetNotification = {
  id: string;
  title: Bi;
  body: Bi;
  minutesAgo: number;
  read: boolean;
  priority: Priority;
  category: NotificationCategory;
  target: ModuleKey;
};

export const NOTIFICATIONS: FleetNotification[] = [
  { id: "n1", title: { en: "Breakdown reported", ar: "تم الإبلاغ عن عطل" }, body: { en: "LRA 1187: engine overheating on King Fahd Rd", ar: "LRA 1187: ارتفاع حرارة المحرك على طريق الملك فهد" }, minutesAgo: 25, read: false, priority: "high", category: "maintenance", target: "breakdowns" },
  { id: "n2", title: { en: "Approval waiting for you", ar: "طلب بانتظار موافقتك" }, body: { en: "APR-1128 emergency repair, SAR 4,300", ar: "APR-1128 إصلاح طارئ بقيمة 4,300 ر.س" }, minutesAgo: 40, read: false, priority: "high", category: "approvals", target: "approvals" },
  { id: "n3", title: { en: "New kilometer reading", ar: "قراءة عداد جديدة" }, body: { en: "Mohammed Al-Otaibi submitted 48,210 km with 2 photos", ar: "أرسل محمد العتيبي قراءة 48,210 كم مع صورتين" }, minutesAgo: 75, read: false, priority: "low", category: "submissions", target: "mileage" },
  { id: "n4", title: { en: "Iqama expired", ar: "انتهت صلاحية الإقامة" }, body: { en: "Rajesh Kumar's Iqama expired 6 days ago", ar: "انتهت إقامة راجيش كومار منذ 6 أيام" }, minutesAgo: 180, read: false, priority: "high", category: "compliance", target: "compliance" },
  { id: "n8", title: { en: "Maintenance overdue", ar: "صيانة متأخرة" }, body: { en: "KSB 7314 periodic service (90,000 km) is 3 days overdue", ar: "الصيانة الدورية لـ KSB 7314 (90,000 كم) متأخرة 3 أيام" }, minutesAgo: 300, read: false, priority: "medium", category: "maintenance", target: "maintenance" },
  { id: "n9", title: { en: "Fuel allocation exceeded", ar: "تجاوز مخصص الوقود" }, body: { en: "KHB 3049 has used 101% of its monthly fuel benefit", ar: "استهلكت KHB 3049 نسبة 101% من مخصص الوقود الشهري" }, minutesAgo: 600, read: false, priority: "medium", category: "expenses", target: "fuel" },
  { id: "n10", title: { en: "Driving license expiring", ar: "رخصة القيادة على وشك الانتهاء" }, body: { en: "Mohammed Al-Otaibi's license expires in 18 days", ar: "تنتهي رخصة محمد العتيبي خلال 18 يومًا" }, minutesAgo: 1260, read: true, priority: "medium", category: "compliance", target: "compliance" },
  { id: "n7", title: { en: "Traffic violation", ar: "مخالفة مرورية" }, body: { en: "RKB 9302 speeding fine SAR 300", ar: "RKB 9302 مخالفة سرعة بقيمة 300 ر.س" }, minutesAgo: 1440, read: true, priority: "medium", category: "incidents", target: "violations" },
  { id: "n5", title: { en: "Accident recorded", ar: "تم تسجيل حادث" }, body: { en: "RDA 6610 rear-ended on Olaya St (Najm report attached)", ar: "RDA 6610 اصطدام من الخلف في شارع العليا (مرفق تقرير نجم)" }, minutesAgo: 2880, read: true, priority: "high", category: "incidents", target: "accidents" },
  { id: "n11", title: { en: "Request approved", ar: "تم اعتماد الطلب" }, body: { en: "APR-1125 gearbox repair approved by the Fleet Manager", ar: "اعتمد مدير الأسطول الطلب APR-1125 لإصلاح ناقل الحركة" }, minutesAgo: 2900, read: true, priority: "low", category: "approvals", target: "approvals" },
  { id: "n6", title: { en: "Insurance expiring", ar: "التأمين على وشك الانتهاء" }, body: { en: "KHB 3049 insurance expires in 14 days", ar: "ينتهي تأمين KHB 3049 خلال 14 يومًا" }, minutesAgo: 4320, read: true, priority: "medium", category: "compliance", target: "compliance" },
  { id: "n12", title: { en: "Invoice unpaid", ar: "فاتورة غير مدفوعة" }, body: { en: "INV-5556 Tawuniya insurance, SAR 2,950 is still unpaid", ar: "الفاتورة INV-5556 للتعاونية للتأمين بقيمة 2,950 ر.س لم تُدفع بعد" }, minutesAgo: 4400, read: true, priority: "low", category: "expenses", target: "expenses" },
];

// ---------- Users & roles ----------

export type RoleKey = "superAdmin" | "hr" | "fleetManager" | "assistant" | "driver";

export const ROLES: Record<RoleKey, { name: Bi; description: Bi }> = {
  superAdmin: { name: { en: "Super Admin", ar: "المسؤول العام" }, description: { en: "Full administration, configuration and user management", ar: "إدارة كاملة للنظام والإعدادات والمستخدمين" } },
  hr: { name: { en: "HR", ar: "الموارد البشرية" }, description: { en: "Driver information and compliance records", ar: "بيانات السائقين وسجلات الامتثال" } },
  fleetManager: { name: { en: "Fleet Manager", ar: "مدير الأسطول" }, description: { en: "Fleet operations, maintenance, incidents, approvals, expenses and reports", ar: "عمليات الأسطول والصيانة والحوادث والموافقات والمصروفات والتقارير" } },
  assistant: { name: { en: "Assistant", ar: "المساعد" }, description: { en: "Operational support and assigned approvals", ar: "الدعم التشغيلي والموافقات المسندة" } },
  driver: { name: { en: "Driver", ar: "السائق" }, description: { en: "Mobile app only: submissions, requests and notifications", ar: "تطبيق الجوال فقط: الإرسال والطلبات والإشعارات" } },
};

export type OfficeUser = { name: Bi; email: string; role: RoleKey; lastActive: Bi; status: StatusCode };

export const OFFICE_USERS: OfficeUser[] = [
  { name: { en: "Turki Al-Saud", ar: "تركي آل سعود" }, email: "turki@montaka.sa", role: "superAdmin", lastActive: { en: "Online now", ar: "متصل الآن" }, status: "active" },
  { name: { en: "Majed Al-Rashid", ar: "ماجد الراشد" }, email: "majed@montaka.sa", role: "fleetManager", lastActive: { en: "10 min ago", ar: "منذ 10 دقائق" }, status: "active" },
  { name: { en: "Hessa Al-Anazi", ar: "حصة العنزي" }, email: "hessa@montaka.sa", role: "hr", lastActive: { en: "1 hour ago", ar: "منذ ساعة" }, status: "active" },
  { name: { en: "Faisal Al-Ghamdi", ar: "فيصل الغامدي" }, email: "faisal@montaka.sa", role: "assistant", lastActive: { en: "Yesterday", ar: "أمس" }, status: "active" },
  { name: { en: "Omar Al-Juhani", ar: "عمر الجهني" }, email: "omar@montaka.sa", role: "assistant", lastActive: { en: "3 days ago", ar: "منذ 3 أيام" }, status: "active" },
  { name: { en: "Reem Al-Subaie", ar: "ريم السبيعي" }, email: "reem@montaka.sa", role: "hr", lastActive: { en: "2 weeks ago", ar: "منذ أسبوعين" }, status: "inactive" },
];

export type Access = "full" | "view" | "none";

/** Indicative permission matrix from the proposal; finalised during design. */
export const PERMISSIONS: { area: Bi; access: Record<Exclude<RoleKey, "driver">, Access> }[] = [
  { area: { en: "Vehicles", ar: "المركبات" }, access: { superAdmin: "full", hr: "view", fleetManager: "full", assistant: "view" } },
  { area: { en: "Drivers", ar: "السائقون" }, access: { superAdmin: "full", hr: "full", fleetManager: "full", assistant: "view" } },
  { area: { en: "Maintenance & breakdowns", ar: "الصيانة والأعطال" }, access: { superAdmin: "full", hr: "none", fleetManager: "full", assistant: "full" } },
  { area: { en: "Approvals", ar: "الموافقات" }, access: { superAdmin: "full", hr: "none", fleetManager: "full", assistant: "full" } },
  { area: { en: "Accidents & violations", ar: "الحوادث والمخالفات" }, access: { superAdmin: "full", hr: "view", fleetManager: "full", assistant: "view" } },
  { area: { en: "Compliance & expiries", ar: "الامتثال والصلاحيات" }, access: { superAdmin: "full", hr: "full", fleetManager: "view", assistant: "view" } },
  { area: { en: "Fuel & expenses", ar: "الوقود والمصروفات" }, access: { superAdmin: "full", hr: "none", fleetManager: "full", assistant: "view" } },
  { area: { en: "Reports", ar: "التقارير" }, access: { superAdmin: "full", hr: "view", fleetManager: "full", assistant: "view" } },
  { area: { en: "Users & settings", ar: "المستخدمون والإعدادات" }, access: { superAdmin: "full", hr: "none", fleetManager: "none", assistant: "none" } },
];

// ---------- Reports ----------

export type ReportId = "expiry" | "maintenance" | "mileage" | "accidents" | "violations" | "expenses" | "history";
export type ReportGroup = "compliance" | "maintenance" | "mileage" | "incidents" | "finance" | "history";

export const REPORT_GROUPS: Record<ReportGroup, Bi> = {
  compliance: { en: "Compliance", ar: "الامتثال" },
  maintenance: { en: "Maintenance", ar: "الصيانة" },
  mileage: { en: "Mileage", ar: "العداد" },
  incidents: { en: "Incidents", ar: "الحوادث والمخالفات" },
  finance: { en: "Finance", ar: "المالية" },
  history: { en: "History", ar: "السجلات" },
};

export const REPORTS: { id: ReportId; group: ReportGroup; icon: string; title: Bi; description: Bi }[] = [
  { id: "expiry", group: "compliance", icon: "shield", title: { en: "License & Iqama expiry", ar: "انتهاء الرخص والإقامات" }, description: { en: "Upcoming and expired driver documents", ar: "وثائق السائقين المنتهية والقريبة من الانتهاء" } },
  { id: "maintenance", group: "maintenance", icon: "wrench", title: { en: "Maintenance & breakdowns", ar: "الصيانة والأعطال" }, description: { en: "Scheduled, major and emergency maintenance", ar: "الصيانة المجدولة والكبيرة والطارئة" } },
  { id: "mileage", group: "mileage", icon: "gauge", title: { en: "Mileage", ar: "قراءات العداد" }, description: { en: "Kilometers by vehicle and driver", ar: "الكيلومترات حسب المركبة والسائق" } },
  { id: "accidents", group: "incidents", icon: "accident", title: { en: "Accidents", ar: "الحوادث" }, description: { en: "Accidents, costs and reference reports", ar: "الحوادث والتكاليف والتقارير المرجعية" } },
  { id: "violations", group: "incidents", icon: "ticket", title: { en: "Traffic violations", ar: "المخالفات المرورية" }, description: { en: "Fines by driver, vehicle and status", ar: "الغرامات حسب السائق والمركبة والحالة" } },
  { id: "expenses", group: "finance", icon: "receipt", title: { en: "Fleet expenses & invoices", ar: "مصروفات وفواتير الأسطول" }, description: { en: "Spend by category, vehicle and vendor", ar: "الإنفاق حسب الفئة والمركبة والمورد" } },
  { id: "history", group: "history", icon: "history", title: { en: "Vehicle & driver history", ar: "سجل المركبات والسائقين" }, description: { en: "Full timeline per vehicle or driver", ar: "السجل الكامل لكل مركبة أو سائق" } },
];
