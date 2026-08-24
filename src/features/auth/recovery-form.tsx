"use client";

import { FormEvent, useState } from "react";

import { authCopy } from "@/features/auth/auth-copy";
import { requestRecovery } from "@/features/auth/request-recovery";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";

export function validateRecoveryEmail(email: string): string | undefined {
  const value = email.trim();

  if (!value || !value.includes("@")) {
    return "Informe um email válido.";
  }

  return undefined;
}

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isHydrated = useIsHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRecoveryEmail(email);
    setError(validationError);

    if (validationError) {
      return;
    }

    setIsSubmitting(true);
    setSubmitted(false);
    const result = await requestRecovery(email.trim());
    setIsSubmitting(false);

    if (!result.ok) {
      setError("Não foi possível enviar agora. Tente novamente mais tarde.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div aria-live="polite" className="space-y-4 rounded-2xl bg-emerald-50 p-5 text-emerald-950">
        <p className="font-semibold">{authCopy.recoveryConfirmation}</p>
        <p className="text-sm leading-6">{authCopy.recoverySupport}</p>
      </div>
    );
  }

  return (
    <form className="space-y-5" method="post" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="recovery-email">
          Email
        </label>
        <input
          aria-describedby={error ? "recovery-email-error" : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="recovery-email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        {error ? (
          <p className="mt-2 text-sm text-red-700" id="recovery-email-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button
        className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting || !isHydrated}
        type="submit"
      >
        {isHydrated ? (isSubmitting ? "Enviando…" : "Enviar instruções") : "Carregando…"}
      </button>
    </form>
  );
}
