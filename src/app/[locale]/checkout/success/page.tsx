import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { order } = await searchParams;
  const t = await getTranslations("checkout");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-success">{t("successTitle")}</CardTitle>
          <CardDescription>{t("successBody")}</CardDescription>
        </div>

        {typeof order === "string" && (
          <p className="text-sm text-muted">
            {t("orderRef")}:{" "}
            <span className="font-mono text-xs">{order}</span>
          </p>
        )}

        <Link href="/dashboard" className="text-sm text-accent underline">
          {t("backHome")}
        </Link>
      </Card>
    </div>
  );
}
