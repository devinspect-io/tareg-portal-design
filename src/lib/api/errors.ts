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
  READING_BELOW_ODOMETER: { en: "This reading is below the vehicle's current odometer. Reject it instead.", ar: "هذه القراءة أقل من عداد المركبة الحالي. ارفضها بدلًا من ذلك." },
  NOT_APPROVED: { en: "Only an approved request can be closed. Refresh to see its current status.", ar: "يمكن إغلاق الطلب المعتمد فقط. حدّث الصفحة لرؤية حالته الحالية." },
  INVALID_STATUS: { en: "This record has already moved on. Refresh to see its current status.", ar: "تغيرت حالة هذا السجل بالفعل. حدّث الصفحة لرؤية حالته الحالية." },
  ALREADY_CLOSED: { en: "This record is already closed and can no longer change.", ar: "هذا السجل مغلق بالفعل ولا يمكن تعديله." },
  ALREADY_COMPLETED: { en: "This maintenance record is already completed and locked.", ar: "سجل الصيانة هذا مكتمل ومقفل بالفعل." },
  ALREADY_PAID: { en: "This violation is already marked as paid.", ar: "تم تسجيل هذه المخالفة كمدفوعة بالفعل." },
  FILE_NOT_FOUND: { en: "Some attached files are missing or were uploaded by someone else.", ar: "بعض الملفات المرفقة غير موجودة أو رفعها شخص آخر." },
  FILES_SERVICE_UNAVAILABLE: { en: "The file service is not reachable right now. Try again in a moment.", ar: "خدمة الملفات غير متاحة حاليًا. حاول مرة أخرى بعد قليل." },
  FILES_SERVICE_ERROR: { en: "The file service returned an unexpected response. Try again.", ar: "أرجعت خدمة الملفات استجابة غير متوقعة. حاول مرة أخرى." },
  NOT_ENOUGH_PHOTOS: { en: "Not enough odometer photos. Add the minimum number set in Settings.", ar: "عدد صور العداد غير كافٍ. أضف الحد الأدنى المحدد في الإعدادات." },
  PHOTOS_REQUIRED: { en: "A photo is required for this report.", ar: "الصورة مطلوبة لهذا البلاغ." },
  MAINTENANCE_REQUESTS_DISABLED: { en: "Maintenance requests from drivers are turned off in Settings.", ar: "طلبات الصيانة من السائقين متوقفة في الإعدادات." },
  ALREADY_RECORDED: { en: "This request already has a maintenance record.", ar: "لهذا الطلب سجل صيانة بالفعل." },
  NOT_A_DRIVER: { en: "Only driver accounts can do this.", ar: "حسابات السائقين فقط يمكنها تنفيذ هذا الإجراء." },
  NO_ASSIGNED_VEHICLE: { en: "This driver has no vehicle assigned.", ar: "لا توجد مركبة مسندة لهذا السائق." },
  NOT_A_MAINTENANCE_REQUEST: { en: "An expense claim cannot have a maintenance record.", ar: "لا يمكن أن يكون لمطالبة المصروفات سجل صيانة." },
  REQUEST_NOT_FOUND: { en: "That request was not found for this driver.", ar: "لم يتم العثور على هذا الطلب لهذا السائق." },
  REQUEST_NOT_APPROVED: { en: "Maintenance needs an approved request first.", ar: "تحتاج الصيانة إلى طلب معتمد أولًا." },
};

/** NOT_YOUR_TURN carries the request's status: say who it waits on now. */
const NOT_YOUR_TURN: Record<string, Bi> = {
  pendingAssistant: { en: "This request is waiting for the Assistant, not for your role.", ar: "هذا الطلب بانتظار المساعد وليس دورك." },
  pendingFleetManager: { en: "This request has moved on and is now waiting for the Fleet Manager.", ar: "انتقل هذا الطلب وهو الآن بانتظار مدير الأسطول." },
  other: { en: "This request has already been decided. Refresh to see where it stands.", ar: "تم البت في هذا الطلب بالفعل. حدّث الصفحة لمعرفة حالته." },
};

const DRIVER_ACCOUNT: Bi = { en: "Driver accounts sign in through the Tareg mobile app.", ar: "يسجل السائقون الدخول عبر تطبيق طارق للجوال." };

export function errorText(e: unknown, tx: (b: Bi) => string): string {
  if (e instanceof DriverAccountError) return tx(DRIVER_ACCOUNT);
  if (e instanceof ApiError) {
    if (e.code === "NOT_YOUR_TURN") {
      const status = (e.details as { status?: string } | undefined)?.status ?? "";
      return tx(NOT_YOUR_TURN[status] ?? NOT_YOUR_TURN.other);
    }
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
