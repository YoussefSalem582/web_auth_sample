import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { piastresToEgp } from "@/lib/paymob";

/**
 * Example protected route. proxy.ts already bounces signed-out users, but the
 * page checks again — never trust the proxy alone for authorization.
 */
export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/sign-in", locale });

  // RLS restricts this to the signed-in user's own rows.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, amount, currency, status, paymob_order_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted">
          {t("dashboard.signedInAs", { email: user!.email ?? "" })}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle>{t("dashboard.ordersTitle")}</CardTitle>

        {!orders || orders.length === 0 ? (
          <CardDescription>{t("dashboard.empty")}</CardDescription>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 text-start font-medium">
                    {t("dashboard.colAmount")}
                  </th>
                  <th className="py-2 text-start font-medium">
                    {t("dashboard.colStatus")}
                  </th>
                  <th className="py-2 text-start font-medium">
                    {t("dashboard.colRef")}
                  </th>
                  <th className="py-2 text-start font-medium">
                    {t("dashboard.colDate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="py-2">
                      {piastresToEgp(order.amount).toFixed(2)} {order.currency}
                    </td>
                    <td className="py-2">{t(`status.${order.status}`)}</td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {order.paymob_order_id ?? "—"}
                    </td>
                    <td className="py-2 text-muted">
                      {new Date(order.created_at).toLocaleString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* TODO: your product's dashboard goes here. */}
    </div>
  );
}
