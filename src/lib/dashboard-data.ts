// Nav config + demo data for the Tareg dashboard.
// All figures are placeholder demo data until the real backend exists.

export type NavItem = {
  label: string;
  icon: string; // key into the icon map in Sidebar
  hasChildren?: boolean;
  /** Kept in config (and its view still routable) but left out of the sidebar. */
  hidden?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "home" },
  { label: "AI Reporting", icon: "sparkles", hidden: true },
  { label: "Customers/Carriers", icon: "people", hasChildren: true },
  { label: "Shipments", icon: "truck", hasChildren: true },
  { label: "Billing & Invoices", icon: "invoice" },
  { label: "Procurement", icon: "cart", hasChildren: true },
  { label: "Warehouse Stock", icon: "boxes", hasChildren: true },
  { label: "Vouchers", icon: "receipt", hasChildren: true },
  { label: "Banking", icon: "bank", hasChildren: true },
  { label: "Chart Of Accounts", icon: "ledger" },
  { label: "Financial Reports", icon: "chart", hasChildren: true },
  { label: "HRM", icon: "person", hasChildren: true },
  { label: "Fleet Maintenance", icon: "factory", hasChildren: true },
  { label: "Master Setup", icon: "gears", hasChildren: true },
  { label: "System Setup", icon: "tools", hasChildren: true },
];

export const STATS = [
  { label: "Shipments", value: 1284, sub: "Shipments Completed All Time", prefix: "" },
  { label: "Revenue", value: 2845600, sub: "Revenue All Time", prefix: "AED " },
  { label: "Purchases", value: 1632400, sub: "Purchases All Time", prefix: "AED " },
  { label: "Stock", value: 1106700, sub: "Warehouse Stock Valuation", prefix: "AED " },
  { label: "Receivable", value: 184500, sub: "Accounts Receivable", prefix: "AED " },
  { label: "Payable", value: 96200, sub: "Accounts Payable", prefix: "AED " },
];

export const QUICK_ACTIONS = [
  { label: "New Shipment Invoice", icon: "pos" },
  { label: "New Procurement", icon: "cart" },
  { label: "New Receive Voucher", icon: "voucher" },
  { label: "Record Expenses", icon: "receipt" },
  { label: "Cash Flow Report", icon: "flow" },
  { label: "Bank Statement", icon: "bank" },
];

export const LAST_7_DAYS = [
  "Aug 14",
  "Aug 15",
  "Aug 16",
  "Aug 17",
  "Aug 18",
  "Aug 19",
  "Aug 20",
];

export const SALES_TREND = [42, 58, 37, 71, 64, 89, 76];

export const REVENUE_SERIES = [86400, 112800, 74300, 139200, 121500, 168400, 143000];
export const EXPENSE_SERIES = [51200, 63400, 48900, 82100, 70300, 91800, 76500];

export const CASH_IN = [64000, 88500, 59200, 104800, 93600, 127400, 108200];
export const CASH_OUT = [48700, 55300, 61800, 72400, 58900, 84600, 69100];

export const RECEIVABLE_TOTAL = 184500;
export const PAYABLE_TOTAL = 96200;

export const BRANCH_SALES = [
  { name: "Deira", value: 984500 },
  { name: "Jebel Ali", value: 762300 },
  { name: "Al Quoz", value: 611800 },
  { name: "Business Bay", value: 487000 },
];

export const TERRITORY_SALES = [
  { name: "Dubai", value: 1428600 },
  { name: "Riyadh", value: 864200 },
  { name: "Abu Dhabi", value: 552800 },
];

export const TOP_ROUTES = [
  { route: "Dubai → Riyadh", shipments: 214, revenue: "AED 428,000" },
  { route: "Dubai → Abu Dhabi", shipments: 342, revenue: "AED 376,200" },
  { route: "Riyadh → Dammam", shipments: 188, revenue: "AED 225,600" },
  { route: "Dubai → Jeddah", shipments: 167, revenue: "AED 133,600" },
  { route: "Sharjah → Dubai", shipments: 54, revenue: "AED 129,600" },
];

export const TOP_CUSTOMERS = [
  { customer: "Metro Textiles Ltd", orders: 48, sales: "AED 512,400" },
  { customer: "Al-Falah Traders", orders: 39, sales: "AED 428,900" },
  { customer: "Highway Distribution Co.", orders: 31, sales: "AED 336,700" },
  { customer: "Dubai Wholesale Mart", orders: 26, sales: "AED 289,300" },
  { customer: "Star Cargo Exports", orders: 19, sales: "AED 204,100" },
];

export const INVENTORY_STATUS = [
  { item: "Diesel (Liters)", stock: 122, status: "OK" },
  { item: "Pallet Wrap Rolls", stock: 260, status: "OK" },
  { item: "Truck Tires", stock: 18, status: "LOW" },
  { item: "Fuel Filters", stock: 96, status: "OK" },
  { item: "GPS Trackers", stock: 7, status: "LOW" },
];

// ---------- Warehouse Stock module ----------

/** Item names offered in the "New Stock Entry" dropdown. */
export const ITEM_NAMES = [
  "Diesel (Liters)",
  "Pallet Wrap Rolls",
  "Truck Tires",
  "Fuel Filters",
  "GPS Trackers",
  "Cargo Straps",
  "Container Seals",
  "Forklift Batteries",
  "Safety Vests",
  "Loading Ramps",
];

/** Warehouses offered in the "New Stock Entry" dropdown — branch names plus extras. */
export const WAREHOUSES = [
  ...BRANCH_SALES.map((b) => b.name),
  "Al Balad, Jeddah",
];

/** Suppliers offered in the "New Stock Entry" dropdown. */
export const SUPPLIERS = [
  "Continental Tyres Arabia",
  "ADNOC Fuel Services",
  "Packly Pallet Solutions",
  "TrackWell GPS Systems",
  "SafeLoad Cargo Gear",
];

/** Assumed pack size when converting carton counts to individual units. */
export const UNITS_PER_CARTON = 12;

/** Below this many total units (carton × pack size + loose pieces), a row is flagged LOW. */
export const LOW_STOCK_THRESHOLD = 20;

export type InventoryRow = {
  id: string;
  date: string; // yyyy-mm-dd
  item: string;
  carton: number;
  pieces: number;
  supplier: string;
  credit: number;
  debit: number;
  warehouse: string;
};

export const INITIAL_INVENTORY: InventoryRow[] = [
  { id: "inv-1", date: "2026-08-14", item: "Diesel (Liters)", carton: 10, pieces: 2, supplier: "ADNOC Fuel Services", credit: 0, debit: 61000, warehouse: "Deira" },
  { id: "inv-2", date: "2026-08-15", item: "Pallet Wrap Rolls", carton: 21, pieces: 8, supplier: "Packly Pallet Solutions", credit: 45000, debit: 0, warehouse: "Jebel Ali" },
  { id: "inv-3", date: "2026-08-16", item: "Truck Tires", carton: 1, pieces: 6, supplier: "Continental Tyres Arabia", credit: 0, debit: 9400, warehouse: "Al Quoz" },
  { id: "inv-4", date: "2026-08-17", item: "Fuel Filters", carton: 8, pieces: 0, supplier: "ADNOC Fuel Services", credit: 12500, debit: 0, warehouse: "Business Bay" },
  { id: "inv-5", date: "2026-08-18", item: "GPS Trackers", carton: 0, pieces: 7, supplier: "TrackWell GPS Systems", credit: 0, debit: 16800, warehouse: "Deira" },
  { id: "inv-6", date: "2026-08-19", item: "Cargo Straps", carton: 2, pieces: 10, supplier: "SafeLoad Cargo Gear", credit: 8200, debit: 0, warehouse: "Jebel Ali" },
];

export const BALANCE_SHEET = {
  assets: [
    { item: "Cash", amount: "AED 421,500" },
    { item: "Fleet & Equipment", amount: "AED 318,200" },
    { item: "Fuel & Warehouse Stock", amount: "AED 176,800" },
  ],
  totalAssets: "AED 916,500",
  totalLiabilities: "AED 264,300",
  totalEquity: "AED 652,200",
};
