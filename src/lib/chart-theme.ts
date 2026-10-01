import type { Options } from "highcharts";

/** Tareg chart palette — logistics blue first, freight orange second. */
export const CHART_COLORS = [
  "#0a56e0",
  "#ea580c",
  "#171717",
  "#4d8fff",
  "#fb923c",
  "#737373",
];

/** Same palette, tuned for a dark background (ink swapped for off-white). */
export const CHART_COLORS_DARK = [
  "#4d8fff",
  "#fb923c",
  "#e5e5e5",
  "#1f6bfa",
  "#f97316",
  "#a3a3a3",
];

/** Shared hex for series that represent an inbound/positive flow (revenue, cash in, receivable). */
export const PRIME_BLUE = "#0a56e0";
/** Shared hex for series that represent an outbound/negative flow (expenses, cash out, payable). */
export const ACCENT_ORANGE = "#ea580c";

const FONT_STACK =
  'var(--font-geist-sans), system-ui, -apple-system, sans-serif';

/**
 * Base Highcharts options in the Tareg theme. Spread chart-specific
 * options on top: `primeChartOptions({ chart: { type: "line" }, series: [...] })`.
 * Pass `dark: true` to switch axis/label/gridline/tooltip colors for the
 * dark theme (the chart background itself stays transparent either way).
 */
export function primeChartOptions(overrides: Options, dark = false): Options {
  const axisLine = dark ? "#404040" : "#e5e5e5";
  const gridLine = dark ? "#262626" : "#f0f0f0";
  const labelColor = dark ? "#a3a3a3" : "#737373";
  const legendColor = dark ? "#d4d4d4" : "#525252";
  const legendHover = dark ? "#f5f5f5" : "#171717";

  const base: Options = {
    colors: dark ? CHART_COLORS_DARK : CHART_COLORS,
    chart: {
      backgroundColor: "transparent",
      style: { fontFamily: FONT_STACK },
      spacing: [16, 8, 8, 8],
    },
    title: { text: undefined },
    credits: { enabled: false },
    // The a11y module is incompatible with this bundler setup; chart data is
    // also presented in the adjacent tables.
    accessibility: { enabled: false },
    legend: {
      itemStyle: { color: legendColor, fontWeight: "500", fontSize: "12px" },
      itemHoverStyle: { color: legendHover },
    },
    xAxis: {
      lineColor: axisLine,
      tickColor: axisLine,
      labels: { style: { color: labelColor, fontSize: "11px" } },
    },
    yAxis: {
      gridLineColor: gridLine,
      title: { text: undefined },
      labels: { style: { color: labelColor, fontSize: "11px" } },
    },
    tooltip: {
      backgroundColor: dark ? "#f5f5f5" : "#171717",
      borderRadius: 8,
      borderWidth: 0,
      style: { color: dark ? "#171717" : "#ffffff", fontSize: "12px" },
      shadow: false,
    },
    plotOptions: {
      series: { animation: { duration: 1200 } },
    },
  };

  // Shallow-merge per top-level key; overrides win inside each section
  return {
    ...base,
    ...overrides,
    chart: { ...base.chart, ...overrides.chart },
    xAxis: { ...base.xAxis, ...overrides.xAxis },
    yAxis: { ...base.yAxis, ...overrides.yAxis },
    tooltip: { ...base.tooltip, ...overrides.tooltip },
    legend: { ...base.legend, ...overrides.legend },
    plotOptions: { ...base.plotOptions, ...overrides.plotOptions },
  };
}
