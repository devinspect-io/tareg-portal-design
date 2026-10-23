"use client";

// Users & Roles on the real API: the users list with create / edit, the roles
// list with a permission matrix overview, and the role editor.

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, section, type Stat } from "@/components/dashboard/ModulePage";
import { EditButton, Field, FilterBar, RecordModal, TextArea, TextInput, Toast, Toggle } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, Pager, Refreshing, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/errors";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan, useSession } from "@/lib/api/session";
import type { ApiDriver, ApiRole, ApiUser, PermissionCatalog } from "@/lib/api/types";
import { fmtDate } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const PAGE_SIZE = 20;
const MIN_PASSWORD = 8;
/** Mirrors DRIVER_PERMISSIONS in the backend: the only permission a driver-app role may hold. */
const DRIVER_PERMISSIONS = ["mileage:submit"];

const AUDIENCE: Record<"office" | "driver", Bi> = {
  office: { en: "Office portal", ar: "بوابة المكتب" },
  driver: { en: "Driver app", ar: "تطبيق السائق" },
};

const card = "rounded-xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800";

type Tab = "users" | "roles";

// ---------- Small pieces ----------

/** Red hint under a field. */
function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{msg}</p>;
}

/** Styled checkbox (a button with role=checkbox), so no bare browser control. */
function Check({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "border-prime-600 bg-prime-600 text-white" : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800"
      }`}
    >
      {checked && (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}

function LockIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { tx } = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        autoComplete="new-password"
        className={`${inputClass} pe-16`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-prime-600 hover:bg-prime-50 dark:text-prime-400 dark:hover:bg-neutral-700"
      >
        {show ? tx({ en: "Hide", ar: "إخفاء" }) : tx({ en: "Show", ar: "إظهار" })}
      </button>
    </div>
  );
}

function Tabs({ value, onChange, tabs }: { value: Tab; onChange: (t: Tab) => void; tabs: { key: Tab; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`relative rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? "text-foreground" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {active && (
              <motion.span layoutId="users-live-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-neutral-700" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Screen ----------

export default function UsersLive() {
  const { tx } = useT();
  const can = useCan();
  const canUsers = can("users:view");
  const canRoles = can("roles:view");
  const [tabChoice, setTab] = useState<Tab>("users");
  const tab: Tab = tabChoice === "users" ? (canUsers ? "users" : "roles") : canRoles ? "roles" : "users";

  const roles = useApi(() => (canRoles ? api.get<ApiRole[]>("/roles") : Promise.resolve([] as ApiRole[])), `roles-${canRoles}`);
  const catalog = useApi(() => (canRoles ? api.get<PermissionCatalog>("/permissions") : Promise.resolve([] as PermissionCatalog)), `catalog-${canRoles}`);
  const activeCount = useApi(() => (canUsers ? api.page<ApiUser>("/users", { status: "active", pageSize: 1 }) : Promise.resolve(null)), `active-${canUsers}`);
  const allCount = useApi(() => (canUsers ? api.page<ApiUser>("/users", { pageSize: 1 }) : Promise.resolve(null)), `all-${canUsers}`);

  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [userModal, setUserModal] = useState<ApiUser | "new" | null>(null);
  const [roleModal, setRoleModal] = useState<ApiRole | "new" | null>(null);
  const [usersTick, setUsersTick] = useState(0);

  const roleList = useMemo(() => roles.data ?? [], [roles.data]);
  const refreshAll = () => {
    roles.reload();
    activeCount.reload();
    allCount.reload();
    setUsersTick((t) => t + 1);
  };

  const officeUsers = roleList.filter((r) => r.audience === "office").reduce((n, r) => n + (r.userCount ?? 0), 0);
  const driverUsers = roleList.filter((r) => r.audience === "driver").reduce((n, r) => n + (r.userCount ?? 0), 0);
  const total = allCount.data?.total;
  const active = activeCount.data?.total;
  const stats: Stat[] = [
    ...(canUsers
      ? [
          { label: { en: "Total users", ar: "إجمالي المستخدمين" }, value: total === undefined ? "-" : String(total) },
          { label: { en: "Active", ar: "نشطون" }, value: active === undefined ? "-" : String(active), tone: "good" as const },
        ]
      : []),
    ...(canRoles
      ? [
          { label: { en: "Office users", ar: "مستخدمو المكتب" }, value: String(officeUsers) },
          { label: { en: "Driver app users", ar: "مستخدمو تطبيق السائق" }, value: String(driverUsers) },
        ]
      : []),
  ];

  const tabs: { key: Tab; label: string }[] = [
    ...(canUsers ? [{ key: "users" as const, label: tx({ en: "Users", ar: "المستخدمون" }) }] : []),
    ...(canRoles ? [{ key: "roles" as const, label: tx({ en: "Roles & permissions", ar: "الأدوار والصلاحيات" }) }] : []),
  ];

  const primary: { label: Bi; run: () => void } | null =
    tab === "users" && can("users:manage")
      ? { label: { en: "Add user", ar: "إضافة مستخدم" }, run: () => setUserModal("new") }
      : tab === "roles" && can("roles:manage")
        ? { label: { en: "Add role", ar: "إضافة دور" }, run: () => setRoleModal("new") }
        : null;

  return (
    <>
      <Page
        moduleKey="users"
        subtitle={{ en: "Who can sign in, and what each role can open. Drivers sign in through the mobile app.", ar: "من يمكنه تسجيل الدخول وما يمكن لكل دور فتحه. يسجل السائقون الدخول عبر تطبيق الجوال." }}
        stats={stats.length ? stats : undefined}
        primaryAction={primary?.label}
        onPrimaryAction={primary?.run}
      >
        {tabs.length > 1 && (
          <Block>
            <Tabs value={tab} onChange={setTab} tabs={tabs} />
          </Block>
        )}
        {tab === "users" ? (
          <UsersTab roles={roleList} canRoles={canRoles} tick={usersTick} onEdit={(u) => setUserModal(u)} />
        ) : (
          <RolesTab roles={roles} catalog={catalog.data ?? []} onEdit={(r) => setRoleModal(r)} />
        )}
      </Page>

      <UserModal
        target={userModal}
        roles={roleList}
        onClose={() => setUserModal(null)}
        onSaved={(msg) => {
          setUserModal(null);
          setToast(msg);
          refreshAll();
        }}
      />
      <RoleModal
        target={roleModal}
        catalog={catalog.data ?? []}
        onClose={() => setRoleModal(null)}
        onSaved={(msg) => {
          setRoleModal(null);
          setToast(msg);
          refreshAll();
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}

// ---------- Users tab ----------

function UsersTab({ roles, canRoles, tick, onEdit }: { roles: ApiRole[]; canRoles: boolean; tick: number; onEdit: (u: ApiUser) => void }) {
  const { tx, language } = useT();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);

  const users = useApiPage(
    () => api.page<ApiUser>("/users", { page, pageSize: PAGE_SIZE, search: q || undefined, roleId: roleId || undefined, status: status || undefined, sort: "createdAt" }),
    `users-${page}-${q}-${roleId}-${status}-${tick}`,
  );
  const drivers = useApi(
    () => api.page<ApiDriver>("/drivers", { pageSize: 100 }).then((p) => p.items).catch(() => [] as ApiDriver[]),
    "users-drivers",
  );
  const driverName = (id: string | null) => {
    if (!id) return "-";
    const d = drivers.data?.find((x) => x.id === id);
    return d ? `${tx(d.name)} · ${d.employeeNo}` : "-";
  };
  const roleOf = (id: string) => roles.find((r) => r.id === id);

  return (
    <>
      <Block>
        <FilterBar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder={tx({ en: "Search name, email or phone", ar: "ابحث بالاسم أو البريد أو الجوال" })}
          filters={[
            ...(canRoles
              ? [
                  {
                    label: tx({ en: "All roles", ar: "كل الأدوار" }),
                    value: roleId,
                    onChange: (v: string) => {
                      setRoleId(v);
                      setPage(1);
                    },
                    options: roles.map((r) => ({ value: r.id, label: tx(r.name) })),
                  },
                ]
              : []),
            {
              label: tx({ en: "All statuses", ar: "كل الحالات" }),
              value: status,
              onChange: (v: string) => {
                setStatus(v);
                setPage(1);
              },
              options: [
                { value: "active", label: tx({ en: "Active", ar: "نشط" }) },
                { value: "inactive", label: tx({ en: "Inactive", ar: "غير نشط" }) },
              ],
            },
          ]}
          shown={users.items.length}
          total={users.total}
          onClear={() => {
            setSearch("");
            setRoleId("");
            setStatus("");
            setPage(1);
          }}
        />
      </Block>
      <Block>
        <LiveState loading={users.loading} error={users.error} onRetry={users.reload}>
          <Refreshing on={users.fetching} />
          <DataTable
            title={tx({ en: "Users", ar: "المستخدمون" })}
            headers={[
              tx({ en: "Name", ar: "الاسم" }),
              tx({ en: "Phone", ar: "الجوال" }),
              tx({ en: "Role", ar: "الدور" }),
              tx({ en: "Linked driver", ar: "السائق المرتبط" }),
              tx({ en: "Last login", ar: "آخر دخول" }),
              tx({ en: "Status", ar: "الحالة" }),
              "",
            ]}
            empty={tx({ en: "No users match these filters.", ar: "لا يوجد مستخدمون يطابقون هذه المرشحات." })}
            rows={users.items.map((u) => {
              const role = roleOf(u.roleId);
              return {
                key: u.id,
                cells: [
                  <div key="n">
                    <p className="font-semibold text-foreground">{tx(u.name)}</p>
                    <p dir="ltr" className="text-start text-xs text-neutral-500 dark:text-neutral-400">
                      {u.email}
                    </p>
                  </div>,
                  <span key="p" dir="ltr" className="inline-block">
                    {u.phone ?? "-"}
                  </span>,
                  role ? (
                    <span key="r" className="flex flex-wrap items-center gap-1.5">
                      <Badge label={tx(role.name)} tone={role.audience === "driver" ? "warn" : "info"} />
                      {role.audience === "driver" && <span className="text-xs text-neutral-500 dark:text-neutral-400">{tx(AUDIENCE.driver)}</span>}
                    </span>
                  ) : (
                    "-"
                  ),
                  driverName(u.driverId),
                  u.lastLoginAt ? fmtDate(u.lastLoginAt.slice(0, 10), language) : tx({ en: "Never", ar: "لم يسجل الدخول" }),
                  <Badge key="s" label={u.status === "active" ? tx({ en: "Active", ar: "نشط" }) : tx({ en: "Inactive", ar: "غير نشط" })} tone={u.status === "active" ? "good" : "neutral"} />,
                  can("users:manage") ? <EditButton key="e" onClick={() => onEdit(u)} label={tx({ en: `Edit ${u.name.en}`, ar: `تعديل ${u.name.ar}` })} /> : null,
                ],
              };
            })}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={users.total} onPage={setPage} />
        </LiveState>
      </Block>
    </>
  );
}

// ---------- Roles tab ----------

type Access = "manage" | "review" | "submit" | "view" | "none";
const ACCESS_ORDER: Access[] = ["manage", "review", "submit", "view"];

function accessFor(role: ApiRole, module: string): Access {
  for (const a of ACCESS_ORDER) if (role.permissions.includes(`${module}:${a}`)) return a;
  return "none";
}

function RolesTab({ roles, catalog, onEdit }: { roles: { data: ApiRole[] | undefined; loading: boolean; error: unknown; fetching: boolean; reload: () => void }; catalog: PermissionCatalog; onEdit: (r: ApiRole) => void }) {
  const { tx } = useT();
  const can = useCan();
  const list = roles.data ?? [];
  const accessLabel: Record<Access, { label: string; tone: "good" | "info" | "warn" | "neutral" }> = {
    manage: { label: tx({ en: "Manage", ar: "إدارة" }), tone: "good" },
    review: { label: tx({ en: "Review", ar: "مراجعة" }), tone: "info" },
    submit: { label: tx({ en: "Submit", ar: "إرسال" }), tone: "warn" },
    view: { label: tx({ en: "View", ar: "عرض" }), tone: "neutral" },
    none: { label: "-", tone: "neutral" },
  };

  return (
    <LiveState loading={roles.loading} error={roles.error} onRetry={roles.reload}>
      <Block>
        <motion.div variants={section} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onEdit(r)}
              className={`${card} flex flex-col gap-2 p-4 text-start transition-colors hover:border-prime-300 dark:hover:border-prime-700`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{tx(r.name)}</p>
                <span className="flex items-center gap-1.5">
                  {r.locked && (
                    <span className="text-neutral-400" title={tx({ en: "Locked", ar: "مقفل" })}>
                      <LockIcon />
                    </span>
                  )}
                  {r.system && <Badge label={tx({ en: "Built-in", ar: "أساسي" })} tone="neutral" />}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{tx(r.description)}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <Badge label={tx(AUDIENCE[r.audience])} tone={r.audience === "driver" ? "warn" : "info"} />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {tx({ en: `${r.userCount ?? 0} ${r.userCount === 1 ? "user" : "users"}`, ar: `${r.userCount ?? 0} مستخدم` })} · {tx({ en: `${r.permissions.length} ${r.permissions.length === 1 ? "permission" : "permissions"}`, ar: `${r.permissions.length} صلاحية` })}
                </span>
              </div>
              <span className="sr-only">{can("roles:manage") && !r.locked ? tx({ en: "Edit role", ar: "تعديل الدور" }) : tx({ en: "View role", ar: "عرض الدور" })}</span>
            </button>
          ))}
        </motion.div>
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "Permission matrix", ar: "مصفوفة الصلاحيات" })}
          headers={[tx({ en: "Area", ar: "القسم" }), ...list.map((r) => tx(r.name))]}
          rows={catalog.map((m) => ({
            key: m.module,
            cells: [
              <span key="a" className="font-medium whitespace-nowrap text-foreground">
                {tx(m.label)}
              </span>,
              ...list.map((r) => {
                const a = accessFor(r, m.module);
                return a === "none" ? (
                  <span key={r.id} className="text-neutral-300 dark:text-neutral-600">
                    -
                  </span>
                ) : (
                  <Badge key={r.id} label={accessLabel[a].label} tone={accessLabel[a].tone} />
                );
              }),
            ],
          }))}
        />
      </Block>
    </LiveState>
  );
}

// ---------- User modal ----------

function UserModal({ target, roles, onClose, onSaved }: { target: ApiUser | "new" | null; roles: ApiRole[]; onClose: () => void; onSaved: (msg: string) => void }) {
  // Remount per target so the form always starts from that record.
  const key = target === null ? "closed" : target === "new" ? "new" : target.id;
  return <UserForm key={key} target={target} roles={roles} onClose={onClose} onSaved={onSaved} />;
}

function UserForm({ target, roles, onClose, onSaved }: { target: ApiUser | "new" | null; roles: ApiRole[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const { tx } = useT();
  const session = useSession();
  const meId = session.status === "signedIn" ? session.session.user.id : "";
  const editing = target && target !== "new" ? target : null;
  const isSelf = editing?.id === meId;

  const [nameEn, setNameEn] = useState(editing?.name.en ?? "");
  const [nameAr, setNameAr] = useState(editing?.name.ar ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(editing?.roleId ?? "");
  const [driverId, setDriverId] = useState(editing?.driverId ?? "");
  const [active, setActive] = useState((editing?.status ?? "active") === "active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const role = roles.find((r) => r.id === roleId);
  const currentRole = editing ? roles.find((r) => r.id === editing.roleId) : undefined;
  const isDriverRole = role?.audience === "driver";
  const open = target !== null;

  const drivers = useApi(
    () => (open && !editing && isDriverRole ? api.page<ApiDriver>("/drivers", { pageSize: 100 }).then((p) => p.items) : Promise.resolve([] as ApiDriver[])),
    `form-drivers-${open && !editing && isDriverRole}`,
  );

  // Editing keeps the same audience: switching between office and driver would orphan the driver link.
  const roleOptions = roles
    .filter((r) => !editing || !currentRole || r.audience === currentRole.audience)
    .map((r) => ({ value: r.id, label: `${tx(r.name)} · ${tx(AUDIENCE[r.audience])}` }));

  const fe = fieldErrors(error);
  const needPassword = !editing;
  const passwordOk = needPassword ? password.length >= MIN_PASSWORD : password === "" || password.length >= MIN_PASSWORD;
  const valid =
    nameEn.trim() !== "" &&
    nameAr.trim() !== "" &&
    roleId !== "" &&
    passwordOk &&
    (editing ? true : /^\S+@\S+\.\S+$/.test(email.trim())) &&
    (editing || !isDriverRole || driverId !== "");

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = { en: nameEn.trim(), ar: nameAr.trim() };
      const phoneVal = phone.trim() === "" ? null : phone.trim();
      if (editing) {
        const body: Record<string, unknown> = { name, phone: phoneVal };
        if (!isSelf) {
          body.roleId = roleId;
          body.status = active ? "active" : "inactive";
        }
        if (password) body.password = password;
        await api.patch(`/users/${editing.id}`, body);
        onSaved(tx({ en: "User updated", ar: "تم تحديث المستخدم" }));
      } else {
        await api.post("/users", { name, email: email.trim(), phone: phoneVal, password, roleId, driverId: isDriverRole ? driverId : null });
        onSaved(tx({ en: "User created", ar: "تم إنشاء المستخدم" }));
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const driverOptions = (drivers.data ?? []).map((d) => ({ value: d.id, label: `${tx(d.name)} · ${d.employeeNo}` }));

  return (
    <RecordModal
      open={open}
      title={editing ? tx({ en: "Edit user", ar: "تعديل مستخدم" }) : tx({ en: "Add user", ar: "إضافة مستخدم" })}
      onClose={onClose}
      onSave={save}
      canSave={valid && !busy}
    >
      <Field label={tx({ en: "Name (English)", ar: "الاسم (بالإنجليزية)" })}>
        <TextInput value={nameEn} onChange={setNameEn} dir="ltr" />
        <Err msg={fe["name.en"]} />
      </Field>
      <Field label={tx({ en: "Name (Arabic)", ar: "الاسم (بالعربية)" })}>
        <TextInput value={nameAr} onChange={setNameAr} dir="rtl" />
        <Err msg={fe["name.ar"]} />
      </Field>
      <Field label={tx({ en: "Email", ar: "البريد الإلكتروني" })}>
        {editing ? (
          <p dir="ltr" className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-start text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400">
            {editing.email}
          </p>
        ) : (
          <TextInput value={email} onChange={setEmail} dir="ltr" placeholder="name@company.sa" />
        )}
        <Err msg={fe.email} />
      </Field>
      <Field label={tx({ en: "Phone (optional)", ar: "الجوال (اختياري)" })}>
        <TextInput value={phone} onChange={setPhone} dir="ltr" placeholder="05XXXXXXXX" />
        <Err msg={fe.phone} />
      </Field>
      <Field label={editing ? tx({ en: "Set a new password (optional)", ar: "تعيين كلمة مرور جديدة (اختياري)" }) : tx({ en: "Password", ar: "كلمة المرور" })}>
        <PasswordInput value={password} onChange={setPassword} placeholder={tx({ en: `At least ${MIN_PASSWORD} characters`, ar: `${MIN_PASSWORD} أحرف على الأقل` })} />
        {password !== "" && password.length < MIN_PASSWORD ? <Err msg={tx({ en: `Use at least ${MIN_PASSWORD} characters.`, ar: `استخدم ${MIN_PASSWORD} أحرف على الأقل.` })} /> : <Err msg={fe.password} />}
      </Field>
      <Field label={tx({ en: "Role", ar: "الدور" })}>
        {isSelf ? (
          <p className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400">
            {currentRole ? tx(currentRole.name) : "-"} · {tx({ en: "You cannot change your own role", ar: "لا يمكنك تغيير دورك" })}
          </p>
        ) : (
          <CustomSelect
            value={roleId}
            onChange={(v) => {
              setRoleId(v);
              setDriverId("");
            }}
            options={roleOptions}
            placeholder={tx({ en: "Choose a role", ar: "اختر دورًا" })}
          />
        )}
        <Err msg={fe.roleId} />
      </Field>

      {!editing && isDriverRole && (
        <Field label={tx({ en: "Driver", ar: "السائق" })} wide>
          <CustomSelect value={driverId} onChange={setDriverId} options={driverOptions} placeholder={tx({ en: "Choose the driver this account belongs to", ar: "اختر السائق صاحب هذا الحساب" })} />
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {tx({ en: "Drivers sign in to the mobile app with their phone number, so add the phone above.", ar: "يسجل السائقون الدخول إلى تطبيق الجوال برقم جوالهم، لذا أضف رقم الجوال أعلاه." })}
          </p>
          <Err msg={fe.driverId} />
        </Field>
      )}
      {editing && editing.driverId && (
        <Field label={tx({ en: "Linked driver", ar: "السائق المرتبط" })} wide>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{tx({ en: "This account is linked to a driver and signs in through the mobile app.", ar: "هذا الحساب مرتبط بسائق ويسجل الدخول عبر تطبيق الجوال." })}</p>
        </Field>
      )}

      {editing && (
        <Field label={tx({ en: "Account status", ar: "حالة الحساب" })} wide>
          <div className="flex items-center gap-3">
            <Toggle checked={active} onChange={(v) => !isSelf && setActive(v)} label={tx({ en: "Active", ar: "نشط" })} />
            <span className="text-sm text-foreground">{active ? tx({ en: "Active: can sign in", ar: "نشط: يمكنه تسجيل الدخول" }) : tx({ en: "Inactive: cannot sign in", ar: "غير نشط: لا يمكنه تسجيل الدخول" })}</span>
          </div>
          {isSelf && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: "You cannot deactivate your own account.", ar: "لا يمكنك تعطيل حسابك." })}</p>}
        </Field>
      )}
      <FormError error={error} />
    </RecordModal>
  );
}

// ---------- Role modal ----------

function RoleModal({ target, catalog, onClose, onSaved }: { target: ApiRole | "new" | null; catalog: PermissionCatalog; onClose: () => void; onSaved: (msg: string) => void }) {
  const key = target === null ? "closed" : target === "new" ? "new" : target.id;
  return <RoleForm key={key} target={target} catalog={catalog} onClose={onClose} onSaved={onSaved} />;
}

function RoleForm({ target, catalog, onClose, onSaved }: { target: ApiRole | "new" | null; catalog: PermissionCatalog; onClose: () => void; onSaved: (msg: string) => void }) {
  const { tx } = useT();
  const can = useCan();
  const editing = target && target !== "new" ? target : null;
  const [nameEn, setNameEn] = useState(editing?.name.en ?? "");
  const [nameAr, setNameAr] = useState(editing?.name.ar ?? "");
  const [descEn, setDescEn] = useState(editing?.description.en === "-" ? "" : (editing?.description.en ?? ""));
  const [descAr, setDescAr] = useState(editing?.description.ar === "-" ? "" : (editing?.description.ar ?? ""));
  const [audience, setAudience] = useState<"office" | "driver">(editing?.audience ?? "office");
  const [perms, setPerms] = useState<string[]>(editing?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const mayManage = can("roles:manage");
  const readOnly = !mayManage || Boolean(editing?.locked);
  const fe = fieldErrors(error);

  const allowed = (p: string) => (audience === "driver" ? DRIVER_PERMISSIONS.includes(p) : !DRIVER_PERMISSIONS.includes(p));

  const toggle = (module: string, action: string, on: boolean) => {
    setPerms((cur) => {
      const set = new Set(cur);
      const full = `${module}:${action}`;
      if (on) {
        set.add(full);
        // Manage / review make no sense without view.
        if (action !== "view" && action !== "submit" && audience === "office") set.add(`${module}:view`);
      } else {
        set.delete(full);
        if (action === "view") for (const p of [...set]) if (p.startsWith(`${module}:`) && !DRIVER_PERMISSIONS.includes(p)) set.delete(p);
      }
      return [...set];
    });
  };

  const pickAudience = (v: string) => {
    const next = v === "driver" ? "driver" : "office";
    setAudience(next);
    setPerms((cur) => cur.filter((p) => (next === "driver" ? DRIVER_PERMISSIONS.includes(p) : !DRIVER_PERMISSIONS.includes(p))));
  };

  const valid = nameEn.trim() !== "" && nameAr.trim() !== "";
  const canDelete = editing && !editing.system && !editing.locked && (editing.userCount ?? 0) === 0 && mayManage;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = { en: nameEn.trim(), ar: nameAr.trim() };
      const description = { en: descEn.trim() || "-", ar: descAr.trim() || "-" };
      if (editing) {
        await api.patch(`/roles/${editing.id}`, { name, description, permissions: perms });
        onSaved(tx({ en: "Role updated", ar: "تم تحديث الدور" }));
      } else {
        await api.post("/roles", { name, description, audience, permissions: perms });
        onSaved(tx({ en: "Role created", ar: "تم إنشاء الدور" }));
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/roles/${editing.id}`);
      onSaved(tx({ en: "Role deleted", ar: "تم حذف الدور" }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const title = !editing ? tx({ en: "Add role", ar: "إضافة دور" }) : readOnly ? tx({ en: "Role details", ar: "تفاصيل الدور" }) : tx({ en: "Edit role", ar: "تعديل الدور" });

  return (
    <RecordModal open={target !== null} title={title} onClose={onClose} onSave={save} onDelete={canDelete ? remove : undefined} canSave={valid && !busy && !readOnly}>
      {editing?.locked && (
        <p className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600 sm:col-span-2 dark:bg-neutral-800 dark:text-neutral-300">
          <LockIcon />
          {tx({ en: "This role is locked and cannot be changed.", ar: "هذا الدور مقفل ولا يمكن تعديله." })}
        </p>
      )}
      <fieldset disabled={readOnly} className="contents">
        <Field label={tx({ en: "Name (English)", ar: "الاسم (بالإنجليزية)" })}>
          <TextInput value={nameEn} onChange={setNameEn} dir="ltr" />
          <Err msg={fe["name.en"]} />
        </Field>
        <Field label={tx({ en: "Name (Arabic)", ar: "الاسم (بالعربية)" })}>
          <TextInput value={nameAr} onChange={setNameAr} dir="rtl" />
          <Err msg={fe["name.ar"]} />
        </Field>
        <Field label={tx({ en: "Description (English)", ar: "الوصف (بالإنجليزية)" })}>
          <TextArea value={descEn} onChange={setDescEn} />
        </Field>
        <Field label={tx({ en: "Description (Arabic)", ar: "الوصف (بالعربية)" })}>
          <div dir="rtl">
            <TextArea value={descAr} onChange={setDescAr} />
          </div>
        </Field>
        <Field label={tx({ en: "Audience", ar: "الفئة" })} wide>
          {editing ? (
            <Badge label={tx(AUDIENCE[audience])} tone={audience === "driver" ? "warn" : "info"} />
          ) : (
            <CustomSelect
              value={audience}
              onChange={pickAudience}
              options={[
                { value: "office", label: tx(AUDIENCE.office) },
                { value: "driver", label: tx(AUDIENCE.driver) },
              ]}
            />
          )}
          {audience === "driver" && (
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: "Driver app roles can only hold the driver app permissions.", ar: "أدوار تطبيق السائق لا تحمل إلا صلاحيات تطبيق السائق." })}</p>
          )}
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx({ en: "Permissions", ar: "الصلاحيات" })}</p>
          <Err msg={fe.permissions} />
          <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {catalog.map((m) => (
              <div key={m.module} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">{tx(m.label)}</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {m.actions.map((a) => {
                    const ok = allowed(a.permission);
                    return (
                      <span key={a.permission} className={`flex items-center gap-2 text-xs ${ok ? "text-foreground" : "text-neutral-400"}`}>
                        <Check checked={perms.includes(a.permission)} onChange={(v) => toggle(m.module, a.action, v)} disabled={readOnly || !ok} label={`${tx(m.label)}: ${tx(a.label)}`} />
                        {tx(a.label)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </fieldset>
      {editing && !canDelete && mayManage && !editing.locked && (
        <p className="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-400">
          {editing.system
            ? tx({ en: "Built-in roles cannot be deleted.", ar: "لا يمكن حذف الأدوار الأساسية." })
            : tx({ en: "Move this role's users to another role before deleting it.", ar: "انقل مستخدمي هذا الدور إلى دور آخر قبل حذفه." })}
        </p>
      )}
      <FormError error={error} />
    </RecordModal>
  );
}
