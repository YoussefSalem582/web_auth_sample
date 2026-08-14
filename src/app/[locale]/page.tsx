import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const features = [
    t("featureAuth"),
    t("featureI18n"),
    t("featurePaymob"),
    t("featureDb"),
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            {t("ctaDemo")}
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-border/40"
          >
            {t("ctaSignUp")}
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("featuresTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature}>
              <CardDescription>{feature}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {/* TODO: replace this landing page with your product. */}
      <Card>
        <CardTitle>TODO</CardTitle>
        <CardDescription>
          Your product goes here. The payment plumbing is in{" "}
          <code className="rounded bg-border/50 px-1">src/lib/paymob.ts</code>{" "}
          and{" "}
          <code className="rounded bg-border/50 px-1">
            src/app/api/checkout/route.ts
          </code>
          .
        </CardDescription>
      </Card>
    </div>
  );
}
