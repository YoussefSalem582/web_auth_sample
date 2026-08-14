import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="me-auto font-semibold">
          {t("app.name")}
        </Link>

        <Link href="/demo" className="text-sm text-muted hover:text-fg">
          {t("nav.demo")}
        </Link>

        {user ? (
          <>
            <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
              {t("nav.dashboard")}
            </Link>
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-sm text-muted hover:text-fg"
              >
                {t("nav.signOut")}
              </button>
            </form>
          </>
        ) : (
          <Link href="/sign-in" className="text-sm text-muted hover:text-fg">
            {t("nav.signIn")}
          </Link>
        )}

        <LocaleSwitcher label={t("nav.language")} />
        <ThemeToggle label={t("nav.theme")} />
      </nav>
    </header>
  );
}
