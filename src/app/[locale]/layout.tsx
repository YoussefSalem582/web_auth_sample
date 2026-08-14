import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Cairo } from "next/font/google";
import { routing, localeDirections, type Locale } from "@/i18n/routing";
import { themeScript } from "@/lib/theme-script";
import { Header } from "@/components/header";
import "../globals.css";

// Cairo covers both Arabic and Latin, so one font handles both locales.
const cairo = Cairo({
  variable: "--font-app-sans",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Paymob Starter",
  description: "Next.js + Supabase + Paymob starter",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // dir is what actually makes RTL work — Tailwind's logical utilities
    // (ms-*, me-*, ps-*, text-start) follow it automatically.
    <html
      lang={locale}
      dir={localeDirections[locale as Locale]}
      className={`${cairo.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <NextIntlClientProvider>
          <Header />
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
