// Mock datasets for the dashboard modules.
//
// Every module that isn't a bespoke screen (Home, Warehouse Stock, AI
// Reporting, Billing & Invoices) is rendered generically from a ModuleConfig
// here, so adding a module is a data change rather than a new component.

export type ModuleStat = { label: string; value: string };

export type ModuleConfig = {
  title: string;
  subtitle: string;
  stats?: ModuleStat[];
  tableTitle: string;
  headers: string[];
  rows: (string | number)[][];
  /** Column index rendered as a StatusBadge instead of plain text. */
  statusColumn?: number;
};

// ---------- Billing & Invoices ----------

export type InvoiceStatus = "Paid" | "Pending" | "Overdue";

export type Invoice = {
  id: string;
  customer: string;
  issued: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
};

export const INVOICES: Invoice[] = [
  { id: "INV-2041", customer: "Metro Textiles Ltd", issued: "2026-08-02", due: "2026-08-17", amount: 128400, status: "Paid" },
  { id: "INV-2042", customer: "Al-Falah Traders", issued: "2026-08-04", due: "2026-08-19", amount: 86200, status: "Paid" },
  { id: "INV-2043", customer: "Highway Distribution Co.", issued: "2026-08-08", due: "2026-08-23", amount: 54900, status: "Pending" },
  { id: "INV-2044", customer: "Dubai Wholesale Mart", issued: "2026-08-11", due: "2026-08-26", amount: 73500, status: "Pending" },
  { id: "INV-2045", customer: "Star Cargo Exports", issued: "2026-07-18", due: "2026-08-02", amount: 41800, status: "Overdue" },
  { id: "INV-2046", customer: "Gulf Steel Trading", issued: "2026-08-14", due: "2026-08-29", amount: 96300, status: "Pending" },
  { id: "INV-2047", customer: "Metro Textiles Ltd", issued: "2026-07-22", due: "2026-08-06", amount: 33750, status: "Overdue" },
  { id: "INV-2048", customer: "Emirates Foodstuff LLC", issued: "2026-08-16", due: "2026-08-31", amount: 112900, status: "Paid" },
  { id: "INV-2049", customer: "Riyadh Retail Group", issued: "2026-08-19", due: "2026-09-03", amount: 67400, status: "Pending" },
  { id: "INV-2050", customer: "Al-Falah Traders", issued: "2026-08-20", due: "2026-09-04", amount: 45200, status: "Paid" },
];

// ---------- Generic modules ----------

export const MODULE_VIEWS: Record<string, ModuleConfig> = {
  "Customers/Carriers": {
    title: "Customers & Carriers",
    subtitle: "Every account and haulage partner you work with.",
    stats: [
      { label: "Active customers", value: "48" },
      { label: "Contracted carriers", value: "12" },
      { label: "Outstanding balance", value: "AED 184,500" },
      { label: "New this month", value: "6" },
    ],
    tableTitle: "Accounts",
    headers: ["Name", "Type", "City", "Shipments", "Balance", "Status"],
    statusColumn: 5,
    rows: [
      ["Metro Textiles Ltd", "Customer", "Dubai", 48, "AED 512,400", "Active"],
      ["Al-Falah Traders", "Customer", "Riyadh", 39, "AED 428,900", "Active"],
      ["Highway Distribution Co.", "Customer", "Abu Dhabi", 31, "AED 336,700", "Active"],
      ["Gulf Freight Partners", "Carrier", "Dubai", 84, "AED 96,200", "Active"],
      ["Desert Line Haulage", "Carrier", "Jeddah", 52, "AED 41,300", "Active"],
      ["Star Cargo Exports", "Customer", "Jeddah", 19, "AED 204,100", "On hold"],
      ["Emirates Foodstuff LLC", "Customer", "Sharjah", 27, "AED 158,600", "Active"],
      ["Northern Transit Co.", "Carrier", "Dammam", 16, "AED 22,800", "Inactive"],
    ],
  },

  Shipments: {
    title: "Shipments",
    subtitle: "Live and recent consignments across the network.",
    stats: [
      { label: "In transit", value: "37" },
      { label: "Delivered today", value: "18" },
      { label: "Awaiting pickup", value: "9" },
      { label: "On-time rate", value: "98%" },
    ],
    tableTitle: "Recent shipments",
    headers: ["Waybill", "Route", "Customer", "Weight", "ETA", "Status"],
    statusColumn: 5,
    rows: [
      ["PL-04217", "Dubai → Riyadh", "Metro Textiles Ltd", "4.2 t", "6h", "In transit"],
      ["PL-04216", "Dubai → Abu Dhabi", "Emirates Foodstuff LLC", "2.8 t", "2h", "In transit"],
      ["PL-04215", "Riyadh → Dammam", "Al-Falah Traders", "6.1 t", "—", "Delivered"],
      ["PL-04214", "Dubai → Jeddah", "Star Cargo Exports", "8.4 t", "19h", "In transit"],
      ["PL-04213", "Sharjah → Dubai", "Gulf Steel Trading", "3.3 t", "—", "Delivered"],
      ["PL-04212", "Abu Dhabi → Riyadh", "Highway Distribution Co.", "5.7 t", "—", "Delivered"],
      ["PL-04211", "Dubai → Dammam", "Riyadh Retail Group", "1.9 t", "—", "Awaiting pickup"],
      ["PL-04210", "Jeddah → Riyadh", "Desert Line Haulage", "7.2 t", "—", "Cancelled"],
    ],
  },

  Procurement: {
    title: "Procurement",
    subtitle: "Purchase orders for fuel, parts and operating supplies.",
    stats: [
      { label: "Open orders", value: "14" },
      { label: "Spend this month", value: "AED 312,800" },
      { label: "Awaiting delivery", value: "5" },
      { label: "Suppliers", value: "9" },
    ],
    tableTitle: "Purchase orders",
    headers: ["PO #", "Supplier", "Items", "Amount", "Ordered", "Status"],
    statusColumn: 5,
    rows: [
      ["PO-1182", "ADNOC Fuel Services", "Diesel (12,000 L)", "AED 61,000", "Aug 14, 2026", "Received"],
      ["PO-1183", "Packly Pallet Solutions", "Pallet wrap ×260", "AED 45,000", "Aug 15, 2026", "Received"],
      ["PO-1184", "Continental Tyres Arabia", "Truck tyres ×18", "AED 39,400", "Aug 16, 2026", "In transit"],
      ["PO-1185", "TrackWell GPS Systems", "GPS trackers ×24", "AED 16,800", "Aug 18, 2026", "Pending"],
      ["PO-1186", "SafeLoad Cargo Gear", "Cargo straps ×120", "AED 8,200", "Aug 19, 2026", "Received"],
      ["PO-1187", "ADNOC Fuel Services", "Fuel filters ×96", "AED 12,500", "Aug 21, 2026", "Pending"],
    ],
  },

  Vouchers: {
    title: "Vouchers",
    subtitle: "Receipts, payments and journal entries.",
    stats: [
      { label: "Vouchers this month", value: "126" },
      { label: "Receipts", value: "AED 842,300" },
      { label: "Payments", value: "AED 517,900" },
      { label: "Unposted", value: "4" },
    ],
    tableTitle: "Recent vouchers",
    headers: ["Voucher #", "Type", "Party", "Amount", "Date", "Status"],
    statusColumn: 5,
    rows: [
      ["VCH-3391", "Receipt", "Metro Textiles Ltd", "AED 128,400", "Aug 17, 2026", "Posted"],
      ["VCH-3392", "Payment", "ADNOC Fuel Services", "AED 61,000", "Aug 17, 2026", "Posted"],
      ["VCH-3393", "Receipt", "Al-Falah Traders", "AED 86,200", "Aug 19, 2026", "Posted"],
      ["VCH-3394", "Journal", "Depreciation — fleet", "AED 24,600", "Aug 20, 2026", "Posted"],
      ["VCH-3395", "Payment", "Continental Tyres Arabia", "AED 39,400", "Aug 21, 2026", "Pending"],
      ["VCH-3396", "Receipt", "Emirates Foodstuff LLC", "AED 112,900", "Aug 22, 2026", "Pending"],
    ],
  },

  Banking: {
    title: "Banking",
    subtitle: "Account balances and recent movements.",
    stats: [
      { label: "Total balance", value: "AED 1,284,900" },
      { label: "Accounts", value: "4" },
      { label: "Inflow (7d)", value: "AED 646,700" },
      { label: "Outflow (7d)", value: "AED 450,800" },
    ],
    tableTitle: "Accounts & recent movements",
    headers: ["Account", "Bank", "Reference", "Amount", "Date", "Status"],
    statusColumn: 5,
    rows: [
      ["Operating — AED", "Emirates NBD", "Customer receipt", "+ AED 128,400", "Aug 17, 2026", "Cleared"],
      ["Operating — AED", "Emirates NBD", "Fuel payment", "− AED 61,000", "Aug 17, 2026", "Cleared"],
      ["Payroll — AED", "Mashreq Bank", "August salaries", "− AED 214,300", "Aug 25, 2026", "Pending"],
      ["Operating — SAR", "Al Rajhi Bank", "Customer receipt", "+ AED 86,200", "Aug 19, 2026", "Cleared"],
      ["Reserve — AED", "First Abu Dhabi Bank", "Internal transfer", "+ AED 150,000", "Aug 20, 2026", "Cleared"],
      ["Operating — AED", "Emirates NBD", "Tyre purchase", "− AED 39,400", "Aug 21, 2026", "Pending"],
    ],
  },

  "Chart Of Accounts": {
    title: "Chart of Accounts",
    subtitle: "The ledger structure behind every posting.",
    stats: [
      { label: "Total accounts", value: "68" },
      { label: "Asset accounts", value: "21" },
      { label: "Expense accounts", value: "24" },
      { label: "Inactive", value: "3" },
    ],
    tableTitle: "Accounts",
    headers: ["Code", "Account", "Type", "Balance", "Status"],
    statusColumn: 4,
    rows: [
      ["1000", "Cash & bank", "Asset", "AED 1,284,900", "Active"],
      ["1100", "Accounts receivable", "Asset", "AED 184,500", "Active"],
      ["1200", "Fuel & warehouse stock", "Asset", "AED 176,800", "Active"],
      ["1500", "Fleet & equipment", "Asset", "AED 318,200", "Active"],
      ["2000", "Accounts payable", "Liability", "AED 96,200", "Active"],
      ["3000", "Share capital", "Equity", "AED 400,000", "Active"],
      ["4000", "Freight revenue", "Revenue", "AED 2,845,600", "Active"],
      ["5000", "Fuel expense", "Expense", "AED 412,700", "Active"],
      ["5100", "Fleet maintenance", "Expense", "AED 168,400", "Active"],
      ["5900", "Legacy clearing", "Expense", "AED 0", "Inactive"],
    ],
  },

  "Financial Reports": {
    title: "Financial Reports",
    subtitle: "Period statements ready to review or export.",
    stats: [
      { label: "Revenue (MTD)", value: "AED 845,600" },
      { label: "Expenses (MTD)", value: "AED 484,200" },
      { label: "Net profit (MTD)", value: "AED 361,400" },
      { label: "Margin", value: "42.7%" },
    ],
    tableTitle: "Available reports",
    headers: ["Report", "Period", "Generated", "Value", "Status"],
    statusColumn: 4,
    rows: [
      ["Profit & Loss", "Aug 2026", "Aug 22, 2026", "AED 361,400", "Ready"],
      ["Balance Sheet", "Aug 2026", "Aug 22, 2026", "AED 916,500", "Ready"],
      ["Cash Flow Statement", "Aug 2026", "Aug 22, 2026", "AED 195,900", "Ready"],
      ["Trial Balance", "Aug 2026", "Aug 22, 2026", "Balanced", "Ready"],
      ["Aged Receivables", "Aug 2026", "Aug 22, 2026", "AED 184,500", "Ready"],
      ["VAT Return", "Q3 2026", "—", "—", "Pending"],
    ],
  },

  HRM: {
    title: "Human Resources",
    subtitle: "Drivers, dispatchers and back-office staff.",
    stats: [
      { label: "Headcount", value: "64" },
      { label: "Drivers", value: "38" },
      { label: "Monthly payroll", value: "AED 214,300" },
      { label: "On leave", value: "3" },
    ],
    tableTitle: "Employees",
    headers: ["Name", "Role", "Branch", "Joined", "Salary", "Status"],
    statusColumn: 5,
    rows: [
      ["Omar Haddad", "Fleet driver", "Deira", "Mar 2023", "AED 4,800", "Active"],
      ["Yousef Karim", "Fleet driver", "Jebel Ali", "Jul 2022", "AED 5,100", "Active"],
      ["Layla Mansour", "Dispatch coordinator", "Business Bay", "Jan 2024", "AED 8,600", "Active"],
      ["Hassan Nabil", "Warehouse supervisor", "Al Quoz", "Sep 2021", "AED 9,400", "Active"],
      ["Fatima Zahra", "Accounts officer", "Business Bay", "Nov 2023", "AED 7,900", "On leave"],
      ["Bilal Rahman", "Fleet driver", "Jeddah", "Feb 2025", "AED 4,600", "Active"],
      ["Noor Siddiqui", "HR generalist", "Business Bay", "Jun 2024", "AED 8,200", "Active"],
    ],
  },

  "Fleet Maintenance": {
    title: "Fleet Maintenance",
    subtitle: "Service schedules and vehicle readiness.",
    stats: [
      { label: "Vehicles", value: "42" },
      { label: "Road-ready", value: "38" },
      { label: "In service bay", value: "3" },
      { label: "Service due (30d)", value: "7" },
    ],
    tableTitle: "Fleet",
    headers: ["Plate", "Vehicle", "Branch", "Odometer", "Next service", "Status"],
    statusColumn: 5,
    rows: [
      ["DXB-41207", "Freightliner Cascadia", "Deira", "184,200 km", "Sep 12, 2026", "Road-ready"],
      ["DXB-41208", "Freightliner Cascadia", "Jebel Ali", "212,800 km", "Sep 02, 2026", "Road-ready"],
      ["DXB-41209", "Volvo FH16", "Al Quoz", "96,400 km", "Aug 28, 2026", "In service"],
      ["RUH-88401", "Scania R450", "Riyadh", "148,900 km", "Oct 04, 2026", "Road-ready"],
      ["RUH-88402", "Scania R450", "Riyadh", "231,600 km", "Aug 26, 2026", "In service"],
      ["JED-55012", "MAN TGX", "Jeddah", "77,300 km", "Nov 18, 2026", "Road-ready"],
      ["DXB-41210", "Volvo FH16", "Business Bay", "268,100 km", "—", "Out of service"],
    ],
  },

  "Master Setup": {
    title: "Master Setup",
    subtitle: "Core records the rest of the system references.",
    stats: [
      { label: "Branches", value: "5" },
      { label: "Item categories", value: "14" },
      { label: "Tax rates", value: "3" },
      { label: "Currencies", value: "2" },
    ],
    tableTitle: "Master records",
    headers: ["Record", "Category", "Value", "Updated", "Status"],
    statusColumn: 4,
    rows: [
      ["Branches", "Organisation", "5 locations", "Aug 12, 2026", "Active"],
      ["Warehouses", "Organisation", "5 warehouses", "Aug 12, 2026", "Active"],
      ["Item categories", "Inventory", "14 categories", "Aug 09, 2026", "Active"],
      ["Units of measure", "Inventory", "8 units", "Jul 30, 2026", "Active"],
      ["Tax rates", "Finance", "VAT 5%, 0%, Exempt", "Aug 01, 2026", "Active"],
      ["Currencies", "Finance", "AED (base), SAR", "Jul 22, 2026", "Active"],
      ["Payment terms", "Finance", "Net 15, Net 30", "Aug 05, 2026", "Active"],
    ],
  },

  "System Setup": {
    title: "System Setup",
    subtitle: "Access, security and integration settings.",
    stats: [
      { label: "Users", value: "18" },
      { label: "Roles", value: "6" },
      { label: "Integrations", value: "4" },
      { label: "Open sessions", value: "7" },
    ],
    tableTitle: "Configuration",
    headers: ["Setting", "Area", "Value", "Updated", "Status"],
    statusColumn: 4,
    rows: [
      ["User accounts", "Access", "18 users", "Aug 20, 2026", "Active"],
      ["Roles & permissions", "Access", "6 roles", "Aug 18, 2026", "Active"],
      ["Two-factor auth", "Security", "Required for admins", "Aug 15, 2026", "Active"],
      ["Session timeout", "Security", "30 minutes", "Jul 28, 2026", "Active"],
      ["GPS tracking feed", "Integrations", "TrackWell API", "Aug 11, 2026", "Connected"],
      ["Accounting export", "Integrations", "CSV nightly", "Aug 03, 2026", "Connected"],
      ["SMS notifications", "Integrations", "Not configured", "—", "Disabled"],
    ],
  },
};
