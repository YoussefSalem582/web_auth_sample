import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/lib/auth-actions";

export default async function SignUpPage({
  params,
}: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("auth.signUpTitle")}</CardTitle>
          <CardDescription>{t("auth.signUpSubtitle")}</CardDescription>
        </div>

        <AuthForm
          action={signUp}
          locale={locale}
          labels={{
            email: t("auth.email"),
            password: t("auth.password"),
            submit: t("auth.signUpAction"),
          }}
        />

        <CardDescription>
          {t("auth.haveAccount")}{" "}
          <Link href="/sign-in" className="text-accent underline">
            {t("nav.signIn")}
          </Link>
        </CardDescription>
      </Card>
    </div>
  );
}
