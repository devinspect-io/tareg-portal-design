import { Big_Shoulders } from "next/font/google";

/** Condensed industrial display face — marketing homepage headlines/stats only. */
export const displayFont = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
});
