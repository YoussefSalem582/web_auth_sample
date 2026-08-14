import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

/** ar is RTL, en is LTR. Used by the root layout to set <html dir>. */
export const localeDirections: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  // "always" keeps every URL prefixed (/ar/..., /en/...) which makes the
  // locale unambiguous in proxy.ts and in Paymob redirect URLs.
  localePrefix: "always",
  // Off so "/" always lands on Arabic. Set to true if you would rather honour
  // the visitor's Accept-Language header.
  localeDetection: false,
});
