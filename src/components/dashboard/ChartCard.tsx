"use client";

import { useSyncExternalStore } from "react";
import type { Options } from "highcharts";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Loader from "@/components/Loader";

type ChartCardProps = {
  title: string;
  options: Options;
};

const emptySubscribe = () => () => {};

/**
 * Titled dashboard card wrapping a Highcharts chart. The chart renders only
 * on the client (no SSR/window issues); a small gear loader fills in before.
 */
export default function ChartCard({ title, options }: ChartCardProps) {
  // true on the client after hydration, false during SSR — no effect needed
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-64">
        {mounted ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{ style: { width: "100%", height: "100%" } }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-prime-600">
            <Loader size={32} />
          </div>
        )}
      </div>
    </div>
  );
}
