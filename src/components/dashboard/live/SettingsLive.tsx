"use client";

// Settings: GET /settings (settings:view) and PATCH /settings (settings:manage).
// One record drives the reminder stages, the "due soon" thresholds for
// maintenance and the driver app rules. Only changed fields are sent (unknown
// fields are a 400) and the server's field errors are shown under the field.
// The approval chain (Driver, Assistant, Fleet Manager) is fixed, not a
// setting, so it is shown as information only. Users without settings:manage
// see the same screen read-only.

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CustomSelect from "@/components/dashboard/CustomSelect";
import { ApprovalChain, Page, section } from "@/components/dashboard/ModulePage";
import { Field, NumberInput, TextInput, Toast, Toggle } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, ghostBtn } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/errors";
import { useApi } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiSettings, KmFrequency, NotificationCategoryKey, SettingsPatch } from "@/lib/api/types";
import type { ApprovalStep } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const CATEGORY_LABEL: Record<NotificationCategoryKey, Bi> = {
  maintenance: { en: "Maintenance", ar: "الصيانة" },
  approvals: { en: "Approvals", ar: "الموافقات" },
  compliance: { en: "Compliance & expiries", ar: "الامتثال والصلاحيات" },
  incidents: { en: "Incidents", ar: "الحوادث" },
  submissions: { en: "Driver submissions", ar: "ما يرسله السائقون" },
  expenses: { en: "Expenses", ar: "المصروفات" },
};
const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as NotificationCategoryKey[];

const CHAIN: ApprovalStep[] = [
  { role: { en: "Driver", ar: "السائق" }, state: "waiting" },
  { role: { en: "Assistant", ar: "المساعد" }, state: "waiting" },
  { role: { en: "Fleet Manager", ar: "مدير الأسطول" }, state: "waiting" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SettingsCard({ title, description, children }: { title: Bi; description: Bi; children: React.ReactNode }) {
  const { tx } = useT();
  return (
    <motion.section variants={section} className="rounded-xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        <h2 className="text-sm font-bold text-foreground">{tx(title)}</h2>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{tx(description)}</p>
      </div>
      <div className="space-y-4 px-5 py-4">{children}</div>
    </motion.section>
  );
}

function SwitchRow({ label, hint, checked, onChange, disabled }: { label: Bi; hint?: Bi; checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  const { tx } = useT();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{tx(label)}</p>
        {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx(hint)}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={tx(label)} disabled={disabled} />
    </div>
  );
}

/** A field with its validation message underneath. */
function Labeled({ label, error, hint, wide, children }: { label: string; error?: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <Field label={label} wide={wide}>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </Field>
  );
}

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d, i) => d === b[i]);
const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

function SettingsForm({ initial, canManage }: { initial: ApiSettings; canManage: boolean }) {
  const { tx } = useT();
  const [base, setBase] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [dayInput, setDayInput] = useState(NaN);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const ro = !canManage;

  const set = (patch: Partial<ApiSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setServerErrors({});
    setSaveError(null);
  };

  // ---- Validation (mirrors the server's rules) ----
  const errors: Record<string, string> = {};
  const name = draft.companyName.trim();
  if (name.length < 1 || name.length > 200) errors.companyName = tx({ en: "Enter a company name (up to 200 characters).", ar: "أدخل اسم الشركة (حتى 200 حرف)." });
  if (draft.crNumber.trim().length > 50) errors.crNumber = tx({ en: "Up to 50 characters.", ar: "حتى 50 حرفًا." });
  const email = draft.contactEmail.trim();
  if (email !== "" && !EMAIL.test(email)) errors.contactEmail = tx({ en: "Enter a valid email address, or leave it empty.", ar: "أدخل بريدًا إلكترونيًا صحيحًا أو اتركه فارغًا." });
  if (draft.contactPhone.trim().length > 30) errors.contactPhone = tx({ en: "Up to 30 characters.", ar: "حتى 30 حرفًا." });
  if (draft.expiryReminderDays.length < 1 || draft.expiryReminderDays.length > 10) errors.expiryReminderDays = tx({ en: "Keep between 1 and 10 reminder days.", ar: "أبقِ بين 1 و10 أيام تذكير." });
  if (!isInt(draft.maintenanceDaysBefore, 0, 365)) errors.maintenanceDaysBefore = tx({ en: "A whole number from 0 to 365.", ar: "عدد صحيح من 0 إلى 365." });
  if (!isInt(draft.maintenanceKmBefore, 0, 100_000)) errors.maintenanceKmBefore = tx({ en: "A whole number from 0 to 100,000.", ar: "عدد صحيح من 0 إلى 100,000." });
  if (!isInt(draft.minPhotos, 1, 10)) errors.minPhotos = tx({ en: "A whole number from 1 to 10.", ar: "عدد صحيح من 1 إلى 10." });
  const err = (field: string) => errors[field] ?? serverErrors[field];
  const valid = Object.keys(errors).length === 0;

  // ---- What changed ----
  const patch: SettingsPatch = {};
  if (name !== base.companyName) patch.companyName = name;
  if (draft.crNumber.trim() !== base.crNumber) patch.crNumber = draft.crNumber.trim();
  if (email !== base.contactEmail) patch.contactEmail = email;
  if (draft.contactPhone.trim() !== base.contactPhone) patch.contactPhone = draft.contactPhone.trim();
  if (!sameDays(draft.expiryReminderDays, base.expiryReminderDays)) patch.expiryReminderDays = draft.expiryReminderDays;
  if (draft.maintenanceDaysBefore !== base.maintenanceDaysBefore) patch.maintenanceDaysBefore = draft.maintenanceDaysBefore;
  if (draft.maintenanceKmBefore !== base.maintenanceKmBefore) patch.maintenanceKmBefore = draft.maintenanceKmBefore;
  const changedCats = CATEGORY_KEYS.filter((c) => draft.notificationCategories[c] !== base.notificationCategories[c]);
  if (changedCats.length > 0) patch.notificationCategories = Object.fromEntries(changedCats.map((c) => [c, draft.notificationCategories[c]]));
  if (draft.kmFrequency !== base.kmFrequency) patch.kmFrequency = draft.kmFrequency;
  if (draft.minPhotos !== base.minPhotos) patch.minPhotos = draft.minPhotos;
  if (draft.driversCanRequestMaintenance !== base.driversCanRequestMaintenance) patch.driversCanRequestMaintenance = draft.driversCanRequestMaintenance;
  if (draft.breakdownPhotoRequired !== base.breakdownPhotoRequired) patch.breakdownPhotoRequired = draft.breakdownPhotoRequired;
  if (draft.defaultLanguage !== base.defaultLanguage) patch.defaultLanguage = draft.defaultLanguage;
  const dirty = Object.keys(patch).length > 0;

  async function save() {
    if (!dirty || !valid || saving || ro) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await api.patch<ApiSettings>("/settings", patch);
      setBase(saved);
      setDraft(saved);
      setServerErrors({});
      setToast(tx({ en: "Settings saved", ar: "تم حفظ الإعدادات" }));
    } catch (e) {
      setServerErrors(fieldErrors(e));
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  }

  // ---- Reminder days ----
  const addDay = () => {
    if (!isInt(dayInput, 1, 365) || draft.expiryReminderDays.includes(dayInput) || draft.expiryReminderDays.length >= 10) return;
    set({ expiryReminderDays: [...draft.expiryReminderDays, dayInput].sort((a, b) => b - a) });
    setDayInput(NaN);
  };
  const removeDay = (n: number) => set({ expiryReminderDays: draft.expiryReminderDays.filter((d) => d !== n) });
  const dayHint = !Number.isNaN(dayInput) && !isInt(dayInput, 1, 365)
    ? tx({ en: "Use a whole number from 1 to 365.", ar: "استخدم عددًا صحيحًا من 1 إلى 365." })
    : draft.expiryReminderDays.includes(dayInput)
      ? tx({ en: "That day is already in the list.", ar: "هذا اليوم موجود في القائمة." })
      : draft.expiryReminderDays.length >= 10
        ? tx({ en: "The list is full (10 days).", ar: "القائمة ممتلئة (10 أيام)." })
        : "";
  const maxDay = draft.expiryReminderDays.length > 0 ? Math.max(...draft.expiryReminderDays) : null;

  const frequencyOptions: { value: KmFrequency; label: string }[] = [
    { value: "daily", label: tx({ en: "Daily", ar: "يوميًا" }) },
    { value: "weekly", label: tx({ en: "Weekly", ar: "أسبوعيًا" }) },
    { value: "biweekly", label: tx({ en: "Every 2 weeks", ar: "كل أسبوعين" }) },
    { value: "monthly", label: tx({ en: "Monthly", ar: "شهريًا" }) },
  ];

  return (
    <>
      {ro && (
        <motion.p variants={section} className="rounded-lg bg-neutral-100 px-4 py-2.5 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {tx({ en: "You can view the settings but your role cannot change them.", ar: "يمكنك عرض الإعدادات لكن دورك لا يسمح بتغييرها." })}
        </motion.p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard title={{ en: "Company profile", ar: "ملف الشركة" }} description={{ en: "Stored for reports and exports.", ar: "محفوظة للتقارير والتصدير." }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label={tx({ en: "Company name", ar: "اسم الشركة" })} error={err("companyName")}>
              <TextInput value={draft.companyName} onChange={(v) => set({ companyName: v })} disabled={ro} />
            </Labeled>
            <Labeled label={tx({ en: "Commercial Registration (CR) no.", ar: "رقم السجل التجاري" })} error={err("crNumber")}>
              <TextInput value={draft.crNumber} onChange={(v) => set({ crNumber: v })} dir="ltr" disabled={ro} />
            </Labeled>
            <Labeled label={tx({ en: "Fleet contact email", ar: "البريد الإلكتروني للأسطول" })} error={err("contactEmail")}>
              <TextInput value={draft.contactEmail} onChange={(v) => set({ contactEmail: v })} dir="ltr" disabled={ro} />
            </Labeled>
            <Labeled label={tx({ en: "Fleet contact phone", ar: "هاتف الأسطول" })} error={err("contactPhone")}>
              <TextInput value={draft.contactPhone} onChange={(v) => set({ contactPhone: v })} dir="ltr" disabled={ro} />
            </Labeled>
          </div>
        </SettingsCard>

        <SettingsCard
          title={{ en: "Approval workflow", ar: "مسار الموافقات" }}
          description={{ en: "Fixed by the system. Driver requests are signed off in this order.", ar: "ثابت في النظام. تُعتمد طلبات السائقين بهذا الترتيب." }}
        >
          <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
            <ApprovalChain steps={CHAIN} />
          </div>
          <ul className="list-disc space-y-1.5 ps-5 text-xs text-neutral-600 dark:text-neutral-300">
            <li>{tx({ en: "The Assistant checks a request first and passes it to the Fleet Manager.", ar: "يراجع المساعد الطلب أولًا ثم يمرره إلى مدير الأسطول." })}</li>
            <li>{tx({ en: "The Fleet Manager is the last level and can approve without the Assistant.", ar: "مدير الأسطول هو المستوى الأخير ويمكنه الاعتماد دون المساعد." })}</li>
            <li>{tx({ en: "A rejection needs a reason and is final.", ar: "الرفض يحتاج إلى سبب وهو نهائي." })}</li>
          </ul>
        </SettingsCard>

        <SettingsCard title={{ en: "Alerts & reminders", ar: "التنبيهات والتذكيرات" }} description={{ en: "When Compliance and Maintenance warn about what is coming up.", ar: "متى ينبه الامتثال والصيانة بما هو قادم." }}>
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx({ en: "Remind before a document expires (days)", ar: "التذكير قبل انتهاء الوثيقة (بالأيام)" })}</p>
            <div className="flex flex-wrap gap-2">
              {draft.expiryReminderDays.map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-prime-600 bg-prime-600 py-1 ps-3 pe-2 text-xs font-semibold text-white">
                  {tx({ en: `${n} day${n === 1 ? "" : "s"}`, ar: `${n} يوم` })}
                  {!ro && (
                    <button
                      type="button"
                      onClick={() => removeDay(n)}
                      aria-label={tx({ en: `Remove ${n} days`, ar: `إزالة ${n} يوم` })}
                      className="rounded-full p-0.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
              {draft.expiryReminderDays.length === 0 && <span className="text-xs text-neutral-400">{tx({ en: "No reminder days yet.", ar: "لا توجد أيام تذكير بعد." })}</span>}
            </div>
            {!ro && (
              <div className="mt-3 flex items-start gap-2">
                <div className="w-40">
                  <NumberInput value={dayInput} onChange={setDayInput} suffix={tx({ en: "days", ar: "يوم" })} />
                </div>
                <button
                  type="button"
                  onClick={addDay}
                  disabled={!isInt(dayInput, 1, 365) || draft.expiryReminderDays.includes(dayInput) || draft.expiryReminderDays.length >= 10}
                  className="rounded-lg border border-prime-600 px-4 py-2.5 text-sm font-semibold text-prime-700 transition-colors hover:bg-prime-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-prime-300 dark:hover:bg-prime-950/40"
                >
                  {tx({ en: "Add day", ar: "إضافة يوم" })}
                </button>
              </div>
            )}
            {(err("expiryReminderDays") || dayHint) && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{err("expiryReminderDays") || dayHint}</p>}
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {maxDay !== null
                ? tx({
                    en: `A document becomes "expiring soon" ${maxDay} days before it expires. Between 1 and 10 days, saved largest first.`,
                    ar: `تصبح الوثيقة "تنتهي قريبًا" قبل انتهائها بـ ${maxDay} يوم. من 1 إلى 10 أيام، وتُحفظ من الأكبر إلى الأصغر.`,
                  })
                : tx({ en: "The largest day is when a document becomes \"expiring soon\".", ar: "أكبر يوم هو موعد تحول الوثيقة إلى \"تنتهي قريبًا\"." })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label={tx({ en: "Service due soon (days before)", ar: "الصيانة تستحق قريبًا (أيام قبل)" })} error={err("maintenanceDaysBefore")}>
              <NumberInput value={draft.maintenanceDaysBefore} onChange={(v) => set({ maintenanceDaysBefore: v })} suffix={tx({ en: "days", ar: "يوم" })} disabled={ro} />
            </Labeled>
            <Labeled label={tx({ en: "Service due soon (km before)", ar: "الصيانة تستحق قريبًا (كم قبل)" })} error={err("maintenanceKmBefore")}>
              <NumberInput value={draft.maintenanceKmBefore} onChange={(v) => set({ maintenanceKmBefore: v })} suffix={tx({ en: "km", ar: "كم" })} disabled={ro} />
            </Labeled>
          </div>
          <div className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <div>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx({ en: "Notification categories", ar: "فئات الإشعارات" })}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: "Saved now; notifications are not sent yet.", ar: "تُحفظ الآن؛ لم يبدأ إرسال الإشعارات بعد." })}</p>
            </div>
            {CATEGORY_KEYS.map((c) => (
              <SwitchRow
                key={c}
                label={CATEGORY_LABEL[c]}
                checked={draft.notificationCategories[c]}
                onChange={(v) => set({ notificationCategories: { ...draft.notificationCategories, [c]: v } })}
                disabled={ro}
              />
            ))}
          </div>
        </SettingsCard>

        <div className="space-y-6">
          <SettingsCard title={{ en: "Driver mobile app", ar: "تطبيق السائق" }} description={{ en: "Rules the server applies to what drivers submit.", ar: "قواعد يطبقها الخادم على ما يرسله السائقون." }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled
                label={tx({ en: "Kilometer reading frequency", ar: "تكرار قراءة العداد" })}
                hint={tx({ en: "Saved for the driver app; not enforced yet.", ar: "محفوظ لتطبيق السائق؛ لا يُطبق بعد." })}
                error={err("kmFrequency")}
              >
                <CustomSelect value={draft.kmFrequency} onChange={(v) => set({ kmFrequency: v as KmFrequency })} options={frequencyOptions} disabled={ro} />
              </Labeled>
              <Labeled label={tx({ en: "Minimum photos per reading", ar: "الحد الأدنى للصور لكل قراءة" })} error={err("minPhotos")}>
                <NumberInput value={draft.minPhotos} onChange={(v) => set({ minPhotos: v })} disabled={ro} />
              </Labeled>
            </div>
            <SwitchRow
              label={{ en: "Drivers can request maintenance", ar: "يمكن للسائقين طلب صيانة" }}
              hint={{ en: "When off, maintenance, tyres, battery and emergency requests are refused. Expense claims still work.", ar: "عند الإيقاف تُرفض طلبات الصيانة والإطارات والبطارية والطوارئ. تبقى مطالبات المصروفات تعمل." }}
              checked={draft.driversCanRequestMaintenance}
              onChange={(v) => set({ driversCanRequestMaintenance: v })}
              disabled={ro}
            />
            <SwitchRow
              label={{ en: "Photo required for breakdowns", ar: "الصورة إلزامية عند الإبلاغ عن عطل" }}
              hint={{ en: "When on, a breakdown report without a photo is refused.", ar: "عند التفعيل يُرفض بلاغ العطل الذي لا يحتوي على صورة." }}
              checked={draft.breakdownPhotoRequired}
              onChange={(v) => set({ breakdownPhotoRequired: v })}
              disabled={ro}
            />
          </SettingsCard>

          <SettingsCard title={{ en: "Regional & system", ar: "الإعدادات الإقليمية والنظام" }} description={{ en: "Language for new users.", ar: "لغة المستخدمين الجدد." }}>
            <Labeled label={tx({ en: "Default interface language", ar: "لغة الواجهة الافتراضية" })} hint={tx({ en: "Saved for the portal and the driver app.", ar: "محفوظة للبوابة وتطبيق السائق." })} error={err("defaultLanguage")}>
              <CustomSelect
                value={draft.defaultLanguage}
                onChange={(v) => set({ defaultLanguage: v as "ar" | "en" })}
                options={[
                  { value: "ar", label: "العربية" },
                  { value: "en", label: "English" },
                ]}
                disabled={ro}
              />
            </Labeled>
            <dl className="divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {(
                [
                  [{ en: "Currency", ar: "العملة" }, { en: "Saudi Riyal (SAR)", ar: "الريال السعودي (ر.س)" }],
                  [{ en: "Time zone", ar: "المنطقة الزمنية" }, { en: "Asia/Riyadh (UTC+3)", ar: "آسيا/الرياض (UTC+3)" }],
                ] as [Bi, Bi][]
              ).map(([label, value]) => (
                <div key={label.en} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">{tx(label)}</dt>
                  <dd className="font-medium text-foreground">{tx(value)}</dd>
                </div>
              ))}
            </dl>
          </SettingsCard>
        </div>
      </div>

      {/* Save bar appears only with unsaved changes */}
      <AnimatePresence>
        {canManage && (dirty || saveError !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="sticky bottom-4 z-20 space-y-2 rounded-xl border border-prime-200 bg-white px-5 py-3 shadow-xl dark:border-prime-900 dark:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {!valid ? tx({ en: "Fix the highlighted fields to save", ar: "صحح الحقول المميزة لتتمكن من الحفظ" }) : tx({ en: "You have unsaved changes", ar: "لديك تغييرات غير محفوظة" })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDraft(base);
                    setServerErrors({});
                    setSaveError(null);
                  }}
                  className={ghostBtn}
                >
                  {tx({ en: "Discard", ar: "تجاهل" })}
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!dirty || !valid || saving}
                  className="rounded-lg bg-prime-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? tx({ en: "Saving…", ar: "جارٍ الحفظ…" }) : tx({ en: "Save changes", ar: "حفظ التغييرات" })}
                </button>
              </div>
            </div>
            <FormError error={saveError} />
          </motion.div>
        )}
      </AnimatePresence>
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}

export default function SettingsLive() {
  const can = useCan();
  const settings = useApi(() => api.get<ApiSettings>("/settings"), "settings");
  return (
    <Page moduleKey="settings" subtitle={{ en: "Company details, reminder stages, service thresholds and driver app rules.", ar: "بيانات الشركة ومراحل التذكير وحدود الصيانة وقواعد تطبيق السائق." }}>
      <LiveState loading={settings.loading} error={settings.error} onRetry={settings.reload}>
        {settings.data && <SettingsForm initial={settings.data} canManage={can("settings:manage")} />}
      </LiveState>
    </Page>
  );
}
