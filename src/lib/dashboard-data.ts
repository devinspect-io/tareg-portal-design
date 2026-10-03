// Legacy finance demo data. Only the hidden AI Reporting screen (ai-reports.ts)
// still reads this; the fleet portal itself uses fleet-data.ts.

export const STATS = [
  { label: "Shipments", value: 1284, sub: "Shipments Completed All Time", prefix: "" },
  { label: "Revenue", value: 2845600, sub: "Revenue All Time", prefix: "AED " },
  { label: "Purchases", value: 1632400, sub: "Purchases All Time", prefix: "AED " },
  { label: "Stock", value: 1106700, sub: "Warehouse Stock Valuation", prefix: "AED " },
  { label: "Receivable", value: 184500, sub: "Accounts Receivable", prefix: "AED " },
  { label: "Payable", value: 96200, sub: "Accounts Payable", prefix: "AED " },
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
