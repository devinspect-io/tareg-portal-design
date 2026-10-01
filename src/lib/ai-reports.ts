// Canned "AI" report engine for the dashboard assistant.
//
// There is no model behind this — a question is keyword-matched to one of the
// reports below, which are built from the same demo data the dashboard renders.
// Swap `answerQuestion` for a real API call when a backend exists.

import {
  BALANCE_SHEET,
  BRANCH_SALES,
  CASH_IN,
  CASH_OUT,
  EXPENSE_SERIES,
  INVENTORY_STATUS,
  LAST_7_DAYS,
  PAYABLE_TOTAL,
  RECEIVABLE_TOTAL,
  REVENUE_SERIES,
  SALES_TREND,
  STATS,
  TERRITORY_SALES,
  TOP_CUSTOMERS,
  TOP_ROUTES,
} from "@/lib/dashboard-data";

export type ReportTable = {
  headers: string[];
  rows: (string | number)[][];
};

export type AiAnswer = {
  text: string;
  table?: ReportTable;
  /** Short follow-up chips shown under the answer. */
  followUps?: string[];
};

const AED = (n: number) => `AED ${n.toLocaleString()}`;

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

/** Suggested prompts shown when the chat is empty. */
export const SUGGESTED_PROMPTS = [
  "Show me the revenue report",
  "Which routes perform best?",
  "Warehouse stock status",
  "Top customers this period",
  "Cash flow summary",
];

export function answerQuestion(raw: string): AiAnswer {
  const q = raw.toLowerCase();
  const has = (...terms: string[]) => terms.some((t) => q.includes(t));

  if (has("revenue", "sales", "income", "earning")) {
    const total = sum(REVENUE_SERIES);
    const expenses = sum(EXPENSE_SERIES);
    const margin = (((total - expenses) / total) * 100).toFixed(1);
    return {
      text: `Revenue over the last 7 days totalled ${AED(total)} against ${AED(expenses)} of expenses — a ${margin}% margin. All-time revenue stands at ${STATS[1].prefix}${STATS[1].value.toLocaleString()}. The strongest day was ${LAST_7_DAYS[REVENUE_SERIES.indexOf(Math.max(...REVENUE_SERIES))]}.`,
      table: {
        headers: ["Day", "Revenue", "Expenses", "Net"],
        rows: LAST_7_DAYS.map((d, i) => [
          d,
          AED(REVENUE_SERIES[i]),
          AED(EXPENSE_SERIES[i]),
          AED(REVENUE_SERIES[i] - EXPENSE_SERIES[i]),
        ]),
      },
      followUps: ["Cash flow summary", "Which routes perform best?"],
    };
  }

  if (has("route", "lane", "corridor", "trip")) {
    const totalShipments = TOP_ROUTES.reduce((a, r) => a + r.shipments, 0);
    return {
      text: `Across the top five routes we moved ${totalShipments.toLocaleString()} shipments. ${TOP_ROUTES[0].route} leads on revenue at ${TOP_ROUTES[0].revenue}, while ${TOP_ROUTES[1].route} carries the highest volume at ${TOP_ROUTES[1].shipments} shipments.`,
      table: {
        headers: ["Route", "Shipments", "Revenue"],
        rows: TOP_ROUTES.map((r) => [r.route, r.shipments, r.revenue]),
      },
      followUps: ["Show me the revenue report", "Top customers this period"],
    };
  }

  if (has("customer", "client", "account", "shipper")) {
    const orders = TOP_CUSTOMERS.reduce((a, c) => a + c.orders, 0);
    return {
      text: `Your top five customers account for ${orders} shipments this period. ${TOP_CUSTOMERS[0].customer} is the largest by value at ${TOP_CUSTOMERS[0].sales}.`,
      table: {
        headers: ["Customer", "Shipments", "Sales"],
        rows: TOP_CUSTOMERS.map((c) => [c.customer, c.orders, c.sales]),
      },
      followUps: ["Which routes perform best?", "Cash flow summary"],
    };
  }

  if (has("stock", "inventory", "warehouse", "low", "reorder")) {
    const low = INVENTORY_STATUS.filter((i) => i.status === "LOW");
    return {
      text:
        low.length > 0
          ? `${low.length} item${low.length > 1 ? "s are" : " is"} running low and should be reordered: ${low.map((i) => i.item).join(", ")}. Warehouse stock is valued at ${STATS[3].prefix}${STATS[3].value.toLocaleString()}.`
          : `All tracked items are at healthy levels. Warehouse stock is valued at ${STATS[3].prefix}${STATS[3].value.toLocaleString()}.`,
      table: {
        headers: ["Item", "Stock", "Status"],
        rows: INVENTORY_STATUS.map((i) => [i.item, i.stock, i.status]),
      },
      followUps: ["Show me the revenue report", "Branch performance"],
    };
  }

  if (has("cash", "flow", "liquidity")) {
    const inflow = sum(CASH_IN);
    const outflow = sum(CASH_OUT);
    return {
      text: `Cash in over the last 7 days was ${AED(inflow)} against ${AED(outflow)} out — a net position of ${AED(inflow - outflow)}. Receivables sit at ${AED(RECEIVABLE_TOTAL)} and payables at ${AED(PAYABLE_TOTAL)}.`,
      table: {
        headers: ["Day", "Cash in", "Cash out", "Net"],
        rows: LAST_7_DAYS.map((d, i) => [
          d,
          AED(CASH_IN[i]),
          AED(CASH_OUT[i]),
          AED(CASH_IN[i] - CASH_OUT[i]),
        ]),
      },
      followUps: ["Show me the revenue report", "Balance sheet"],
    };
  }

  if (has("receivable", "payable", "owed", "outstanding")) {
    return {
      text: `Accounts receivable total ${AED(RECEIVABLE_TOTAL)} and payables ${AED(PAYABLE_TOTAL)}, leaving a net receivable position of ${AED(RECEIVABLE_TOTAL - PAYABLE_TOTAL)}.`,
      table: {
        headers: ["Account", "Amount"],
        rows: [
          ["Accounts receivable", AED(RECEIVABLE_TOTAL)],
          ["Accounts payable", AED(PAYABLE_TOTAL)],
          ["Net position", AED(RECEIVABLE_TOTAL - PAYABLE_TOTAL)],
        ],
      },
      followUps: ["Cash flow summary", "Balance sheet"],
    };
  }

  if (has("balance", "asset", "liabilit", "equity")) {
    return {
      text: `Total assets are ${BALANCE_SHEET.totalAssets} against ${BALANCE_SHEET.totalLiabilities} of liabilities, leaving ${BALANCE_SHEET.totalEquity} in equity.`,
      table: {
        headers: ["Item", "Amount"],
        rows: [
          ...BALANCE_SHEET.assets.map((a) => [a.item, a.amount]),
          ["Total assets", BALANCE_SHEET.totalAssets],
          ["Total liabilities", BALANCE_SHEET.totalLiabilities],
          ["Total equity", BALANCE_SHEET.totalEquity],
        ],
      },
      followUps: ["Cash flow summary", "Show me the revenue report"],
    };
  }

  if (has("branch", "territory", "city", "region", "location")) {
    return {
      text: `${BRANCH_SALES[0].name} is the strongest branch at ${AED(BRANCH_SALES[0].value)}. By territory, ${TERRITORY_SALES[0].name} leads with ${AED(TERRITORY_SALES[0].value)}.`,
      table: {
        headers: ["Branch", "Sales"],
        rows: BRANCH_SALES.map((b) => [b.name, AED(b.value)]),
      },
      followUps: ["Which routes perform best?", "Warehouse stock status"],
    };
  }

  if (has("shipment", "delivery", "volume", "trend", "on-time", "ontime")) {
    const total = sum(SALES_TREND);
    return {
      text: `You completed ${total} shipments over the last 7 days, averaging ${Math.round(total / SALES_TREND.length)} per day, with a peak of ${Math.max(...SALES_TREND)}. All-time completed shipments: ${STATS[0].value.toLocaleString()}.`,
      table: {
        headers: ["Day", "Shipments delivered"],
        rows: LAST_7_DAYS.map((d, i) => [d, SALES_TREND[i]]),
      },
      followUps: ["Which routes perform best?", "Top customers this period"],
    };
  }

  return {
    text: "I can pull reports from your live dashboard data — revenue, shipments, routes, customers, warehouse stock, cash flow, receivables, branch performance, or the balance sheet. Which would you like?",
    followUps: SUGGESTED_PROMPTS.slice(0, 3),
  };
}
