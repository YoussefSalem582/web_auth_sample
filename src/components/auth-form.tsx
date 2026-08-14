"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthAction = (
  prevState: string | null,
  formData: FormData,
) => Promise<string | null | undefined | void>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full">
      {label}
    </Button>
  );
}

/** Shared by sign-in and sign-up — only the server action differs. */
export function AuthForm({
  action,
  locale,
  next,
  labels,
}: {
  action: AuthAction;
  locale: string;
  next?: string;
  labels: { email: string; password: string; submit: string };
}) {
  const [error, formAction] = useActionState<string | null, FormData>(
    async (prev, formData) => (await action(prev, formData)) ?? null,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      <Input
        label={labels.email}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Input
        label={labels.password}
        name="password"
        type="password"
        autoComplete="current-password"
        minLength={6}
        required
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <SubmitButton label={labels.submit} />
    </form>
  );
}
