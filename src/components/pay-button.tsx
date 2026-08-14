"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Calls our own /api/checkout (which holds the Paymob secret key) and then
 * sends the browser to Paymob's Unified Checkout.
 */
export function PayButton({
  amountEgp,
  locale,
  labels,
}: {
  amountEgp: number;
  locale: string;
  labels: { pay: string; paying: string; error: string };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountEgp, locale }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? response.statusText);

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        labels.error.replace(
          "{message}",
          err instanceof Error ? err.message : String(err),
        ),
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={pay} loading={loading} className="w-full">
        {loading ? labels.paying : labels.pay}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
