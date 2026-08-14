import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { PayButton } from "@/components/pay-button";

export default async function DemoPage({
  params,
}: PageProps<"/[locale]/demo">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/sign-in", locale });

  const t = await getTranslations("demo");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>

        {/* TODO: swap the hardcoded 100 EGP for your real cart/product. */}
        <PayButton
          amountEgp={100}
          locale={locale}
          labels={{
            pay: t("pay"),
            paying: t("paying"),
            error: t("error", { message: "{message}" }),
          }}
        />

        <CardDescription>{t("note")}</CardDescription>
      </Card>
    </div>
  );
}
