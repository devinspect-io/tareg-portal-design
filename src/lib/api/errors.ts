import { ApiError } from "@/lib/api/client";
import { DriverAccountError } from "@/lib/api/session";
import type { Bi } from "@/lib/translations";

// The ONE place a backend error code becomes words on screen. Codes the API
// documents get their own sentence; anything else falls back by status.
const MESSAGES: Record<string, Bi> = {
  NETWORK: { en: "Could not reach the server. Check your connection and try again.", ar: "تعذر الوصول إلى الخادم. تحقق من الاتصال وحاول مرة أخرى." },
  NOT_CONFIGURED: { en: "The portal has no server address configured.", ar: "لم يتم ضبط عنوان الخادم للبوابة." },
  PLATE_TAKEN: { en: "Another vehicle already has this plate number.", ar: "توجد مركبة أخرى بنفس رقم اللوحة." },
  SEQUENCE_NUMBER_TAKEN: { en: "Another vehicle already has this sequence number.", ar: "توجد مركبة أخرى بنفس الرقم التسلسلي." },
  VIN_TAKEN: { en: "Another vehicle already has this VIN.", ar: "توجد مركبة أخرى بنفس رقم الهيكل." },
  INVALID_VIN: { en: "The VIN must be 17 characters (heavy equipment can be shorter).", ar: "يجب أن يكون رقم الهيكل 17 خانة (المعدات الثقيلة قد تكون أقصر)." },
  VEHICLE_ASSIGNED: { en: "End this vehicle's current assignment first.", ar: "أنهِ إسناد المركبة الحالي أولًا." },
  VEHICLE_HAS_HISTORY: { en: "This vehicle has records. Set its status to inactive instead.", ar: "لهذه المركبة سجلات. غيّر حالتها إلى غير نشطة بدلًا من الحذف." },
  EMPLOYEE_NO_TAKEN: { en: "Another driver has this employee number.", ar: "يوجد سائق آخر بنفس الرقم الوظيفي." },
  ID_NUMBER_TAKEN: { en: "Another driver has this ID / Iqama number.", ar: "يوجد سائق آخر بنفس رقم الهوية / الإقامة." },
  DRIVER_HAS_HISTORY: { en: "This driver has records. Set the status to inactive instead.", ar: "لهذا السائق سجلات. غيّر حالته إلى غير نشط بدلًا من الحذف." },
  DRIVER_DOCUMENTS_EXPIRED: { en: "The driver's license or ID has expired, so they cannot be assigned.", ar: "رخصة السائق أو هويته منتهية، لذا لا يمكن إسناده." },
  PERMISSION_DENIED: { en: "Your role does not allow this.", ar: "دورك لا يسمح بهذا الإجراء." },
  ROLE_IS_SYSTEM: { en: "Built-in roles cannot be deleted.", ar: "لا يمكن حذف الأدوار الأساسية." },
  PERMISSIONS_NOT_ALLOWED: { en: "Some of these permissions do not fit this kind of role.", ar: "بعض هذه الصلاحيات لا تناسب هذا النوع من الأدوار." },
  CANNOT_CHANGE_OWN_ROLE: { en: "You cannot change your own role.", ar: "لا يمكنك تغيير دورك." },
  CANNOT_DEACTIVATE_SELF: { en: "You cannot deactivate your own account.", ar: "لا يمكنك تعطيل حسابك." },
  DRIVER_HAS_LOGIN: { en: "This driver already has an app login.", ar: "لهذا السائق حساب دخول للتطبيق بالفعل." },
  DRIVER_NOT_FOUND: { en: "That driver no longer exists.", ar: "هذا السائق لم يعد موجودًا." },
  ROLE_NOT_FOUND: { en: "That role no longer exists.", ar: "هذا الدور لم يعد موجودًا." },
  ID_TYPE_MISMATCH: { en: "National IDs start with 1 and Iqamas with 2.", ar: "تبدأ الهوية الوطنية بالرقم 1 والإقامة بالرقم 2." },
  END_BEFORE_START: { en: "The end date or odometer is before the start of the assignment.", ar: "تاريخ أو عداد الإنهاء قبل بداية الإسناد." },
  ASSIGNMENT_ALREADY_ENDED: { en: "This assignment has already ended.", ar: "انتهى هذا الإسناد بالفعل." },
  VEHICLE_ALREADY_ASSIGNED: { en: "This vehicle already has a driver. End that assignment first.", ar: "هذه المركبة مسندة لسائق. أنهِ ذلك الإسناد أولًا." },
  ALREADY_REVIEWED: { en: "Someone already reviewed this reading. Refresh to see the decision.", ar: "تمت مراجعة هذه القراءة بالفعل. حدّث الصفحة لرؤية القرار." },
  EMAIL_TAKEN: { en: "Another user already has this email.", ar: "يوجد مستخدم آخر بنفس البريد الإلكتروني." },
  PHONE_TAKEN: { en: "Another user already has this phone number.", ar: "يوجد مستخدم آخر بنفس رقم الجوال." },
  DRIVER_REQUIRED: { en: "Driver app accounts must be linked to a driver.", ar: "يجب ربط حسابات تطبيق السائق بسائق." },
  DRIVER_LINK_NOT_ALLOWED: { en: "Only driver app accounts can be linked to a driver.", ar: "يمكن ربط حسابات تطبيق السائق فقط بسائق." },
  ROLE_LOCKED: { en: "This role is locked and cannot be changed.", ar: "هذا الدور مقفل ولا يمكن تعديله." },
  ROLE_IN_USE: { en: "Users still have this role. Move them to another role first.", ar: "ما زال مستخدمون يحملون هذا الدور. انقلهم إلى دور آخر أولًا." },
};

const DRIVER_ACCOUNT: Bi = { en: "Driver accounts sign in through the Tareg mobile app.", ar: "يسجل السائقون الدخول عبر تطبيق طارق للجوال." };

export function errorText(e: unknown, tx: (b: Bi) => string): string {
  if (e instanceof DriverAccountError) return tx(DRIVER_ACCOUNT);
  if (e instanceof ApiError) {
    const known = MESSAGES[e.code];
    if (known) return tx(known);
    if (e.status === 400 || e.status === 422) {
      return e.message ? `${tx({ en: "Check the form", ar: "تحقق من النموذج" })}: ${e.message}` : tx({ en: "Some fields are not valid.", ar: "بعض الحقول غير صالحة." });
    }
    if (e.status === 401) {
      if (/inactive/i.test(e.message)) return tx({ en: "This account is deactivated. Ask an administrator.", ar: "هذا الحساب معطل. تواصل مع المسؤول." });
      return tx({ en: "Wrong email or password.", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    }
    if (e.status === 403) return tx(MESSAGES.PERMISSION_DENIED);
    if (e.status === 404) return tx({ en: "This record no longer exists.", ar: "هذا السجل لم يعد موجودًا." });
    if (e.status === 409) return e.message || tx({ en: "This conflicts with an existing record.", ar: "يتعارض هذا مع سجل موجود." });
  }
  return tx({ en: "Something went wrong on the server. Try again.", ar: "حدث خطأ في الخادم. حاول مرة أخرى." });
}

/** Field-level messages from a 400 validation error, keyed by field path. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !e.details) return {};
  const d = e.details as { field?: string; path?: string; message?: string }[] | Record<string, string[]>;
  const out: Record<string, string> = {};
  if (Array.isArray(d)) {
    for (const item of d) {
      const k = item.path ?? item.field;
      if (k && item.message) out[k] = item.message;
    }
  } else if (typeof d === "object") {
    for (const [k, v] of Object.entries(d)) if (Array.isArray(v) && v[0]) out[k] = String(v[0]);
  }
  return out;
}
