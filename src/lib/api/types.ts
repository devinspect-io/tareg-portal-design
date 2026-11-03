// Wire types for the Tareg backend (tareg-backend, /api/v1). They mirror the
// records the API presents, not the portal's mock types in fleet-data.ts.
// Dates are "yyyy-mm-dd"; timestamps are ISO strings.

import type { Bi } from "@/lib/translations";

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

type Entity = { id: string; createdAt: string; updatedAt: string };

export type ExpiryState = "valid" | "expiringSoon" | "expired";
export type DocStatus = { expiry: string | null; status: ExpiryState | null };

// ---------- Access ----------

/** `module:action`, e.g. "vehicles:manage". */
export type Permission = string;

export type RoleAudience = "office" | "driver";

export type ApiRole = Entity & {
  key: string;
  name: Bi;
  description: Bi;
  audience: RoleAudience;
  permissions: Permission[];
  /** Seeded by the system: cannot be deleted. */
  system: boolean;
  /** Cannot be edited either (Super Admin). */
  locked: boolean;
  userCount?: number;
};

export type PermissionCatalog = {
  module: string;
  label: Bi;
  actions: { permission: Permission; action: string; label: Bi }[];
}[];

export type UserStatus = "active" | "inactive";

export type ApiUser = Entity & {
  name: Bi;
  email: string;
  phone: string | null;
  roleId: string;
  driverId: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
};

export type Session = {
  user: ApiUser;
  role: { id: string; key: string; name: Bi; audience: RoleAudience };
  permissions: Permission[];
};

// ---------- Fleet ----------

export type RecordSummary = { id: string; name: Bi; employeeNo: string };
export type VehicleSummary = { id: string; plateNumber: string; make: Bi; model: Bi };

export type VehicleStatus = "active" | "inMaintenance" | "brokenDown" | "inactive";
export type RegistrationType = "private" | "privateTransport" | "heavyEquipment";
export type MoiStatus = "valid" | "expired" | "none";

export type ApiVehicle = Entity & {
  plateNumber: string;
  registrationType: RegistrationType;
  make: Bi;
  model: Bi;
  manufactureYear: number;
  sequenceNumber: string;
  vin: string;
  primaryColor: Bi;
  bodyType: Bi | null;
  vehicleState: "valid" | "invalid";
  ownershipDate: string | null;
  registrationIssueDate: string;
  registrationExpiry: string;
  inspectionExpiry: string | null;
  inspectionStatus: MoiStatus;
  insuranceStatus: MoiStatus;
  insuranceExpiry: string | null;
  holdStatus: "notHeld" | "held";
  actualUserIdNumber: string | null;
  actualUserName: string | null;
  city: Bi;
  status: VehicleStatus;
  /** Odometer in km. Moves only when a driver's reading is approved. */
  mileage: number;
  currentDriverId: string | null;
  currentDriver: RecordSummary | null;
  documents: { registration: DocStatus; insurance: DocStatus; inspection: DocStatus };
};

/** Create body. `mileage` is the starting odometer and is create-only. */
export type VehicleInput = Omit<ApiVehicle, keyof Entity | "currentDriverId" | "currentDriver" | "documents">;

export type DriverStatus = "active" | "inactive" | "onLeave";
export type AssignmentBlocker = "LICENSE_EXPIRED" | "NATIONAL_ID_EXPIRED" | "IQAMA_EXPIRED";

export type ApiDriver = Entity & {
  name: Bi;
  employeeNo: string;
  phone: string;
  /** National ID starts with 1, Iqama with 2; 10 digits. */
  idNumber: string;
  idType: "national" | "iqama";
  idExpiry: string;
  licenseExpiry: string;
  nationality: Bi;
  status: DriverStatus;
  currentVehicle: VehicleSummary | null;
  documents: { license: DocStatus; id: DocStatus };
  /** Empty when the driver can be given a vehicle. */
  assignmentBlockers: AssignmentBlocker[];
};

export type DriverInput = Pick<ApiDriver, "name" | "employeeNo" | "phone" | "idNumber" | "idType" | "idExpiry" | "licenseExpiry" | "nationality" | "status">;

export type ApiAssignment = Entity & {
  ref: string;
  vehicleId: string;
  driverId: string;
  from: string;
  /** null while the assignment is current. */
  to: string | null;
  startOdometer: number;
  endOdometer: number | null;
  current: boolean;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
  /** km driven; null while current. */
  distance: number | null;
};

export type MileageStatus = "inReview" | "approved" | "rejected";

export type ApiMileage = Entity & {
  ref: string;
  date: string;
  driverId: string;
  vehicleId: string;
  previous: number;
  reading: number;
  /** URLs, or `data:image/jpeg;base64,...` straight from the driver app. */
  photos: string[];
  status: MileageStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
  distance: number;
};

// ---------- Requests and incidents (created from the driver app) ----------

/** Metadata of an upload. Records keep only the file ids; bytes come from GET /files/:id (signed in). */
export type ApiFileInfo = { id: string; originalName: string; mimeType: string; size: number; url: string };

export type ApprovalType = "maintenance" | "emergencyRepair" | "tyres" | "battery" | "expenseClaim";
export type ApprovalStatus = "pendingAssistant" | "pendingFleetManager" | "approved" | "rejected" | "closed";

/** Driver → Assistant → Fleet Manager. The `canX` flags are for the signed-in role: the server decides whose turn it is. */
export type ApiApproval = Entity & {
  ref: string;
  date: string;
  type: ApprovalType;
  driverId: string;
  vehicleId: string;
  amount: number;
  note: string;
  status: ApprovalStatus;
  assistantApprovedBy: string | null;
  assistantApprovedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  closedBy: string | null;
  closedAt: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
  waitingOn: "assistant" | "fleetManager" | null;
  canApprove: boolean;
  canReject: boolean;
  canClose: boolean;
};

export type IncidentStatus = "open" | "inProgress" | "closed";

export type ApiBreakdown = Entity & {
  ref: string;
  date: string;
  vehicleId: string;
  driverId: string;
  location: string;
  description: string;
  major: boolean;
  /** File ids. */
  photos: string[];
  status: IncidentStatus;
  resolution: string | null;
  closedAt: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
};

export type MaintenanceStatus = "inProgress" | "completed";

export type ApiMaintenance = Entity & {
  ref: string;
  date: string;
  vehicleId: string;
  driverId: string;
  approvalId: string;
  category: ApprovalType;
  description: string;
  vendor: string;
  cost: number;
  emergency: boolean;
  /** Invoice photos or PDFs (file ids). */
  invoicePhotos: string[];
  status: MaintenanceStatus;
  nextServiceDate: string | null;
  nextServiceKm: number | null;
  completedAt: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
};

/** Fields staff can correct while a record is in progress. */
export type MaintenancePatch = Partial<Pick<ApiMaintenance, "description" | "vendor" | "cost" | "nextServiceDate" | "nextServiceKm">>;

export type ServiceDue = "overdue" | "dueSoon" | "scheduled";

/** GET /maintenance/schedule: one row per vehicle, from its latest record that sets a next service. Not paged. */
export type ApiServiceDue = {
  vehicleId: string;
  vehicle: VehicleSummary | null;
  recordId: string;
  task: string;
  dueDate: string | null;
  dueKm: number | null;
  currentKm: number;
  daysLeft: number | null;
  kmLeft: number | null;
  status: ServiceDue;
};

export type ApiAccident = Entity & {
  ref: string;
  date: string;
  vehicleId: string;
  driverId: string;
  location: string;
  description: string;
  /** Najm / police report reference. */
  reference: string | null;
  cost: number | null;
  photos: string[];
  status: IncidentStatus;
  notes: string | null;
  closedAt: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
};

export type AccidentPatch = Partial<Pick<ApiAccident, "description" | "reference" | "cost" | "notes">>;

export type ViolationStatus = "unpaid" | "paid";

export type ApiViolation = Entity & {
  ref: string;
  date: string;
  vehicleId: string;
  driverId: string;
  type: string;
  location: string;
  fine: number;
  photos: string[];
  status: ViolationStatus;
  paidAt: string | null;
  vehicle: VehicleSummary | null;
  driver: RecordSummary | null;
};

export type ComplianceDocument = "license" | "nationalId" | "iqama" | "registration" | "insurance" | "inspection";

/** GET /compliance: read from the live driver and vehicle records. */
export type ApiComplianceItem = {
  id: string;
  kind: "driver" | "vehicle";
  document: ComplianceDocument;
  subject: { id: string; name: Bi | null; plateNumber: string | null };
  expiry: string;
  status: ExpiryState;
  /** Negative once expired. */
  daysLeft: number;
  /** Reminder stage reached (30, 7, 3 or 1 days); null before the first and once expired. */
  reminderDay: number | null;
};
