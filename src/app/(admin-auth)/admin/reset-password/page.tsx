"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authCopy } from "@/features/auth/auth-copy";
import { hasRecoverySession, updateRecoveredPassword } from "@/features/auth/recovery-callback";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isReady, setIsReady] = useState<boolean>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    void hasRecoverySession().then(setIsReady);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8 || password !== confirmation) {
      setMessage("Use uma senha com pelo menos 8 caracteres e confirme a mesma senha.");
      return;
    }

    setIsSubmitting(true);
    const updated = await updateRecoveredPassword(password);
    setIsSubmitting(false);
    setMessage(
      updated ? "Senha atualizada. Você já pode entrar no painel." : authCopy.invalidRecoveryLink,
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Wacatalog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Definir nova senha
        </h1>
        <noscript>
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950" role="alert">
            Esta área precisa de JavaScript habilitado para funcionar.
          </p>
        </noscript>
        {isReady === false ? (
          <p
            className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            role="alert"
          >
            {authCopy.invalidRecoveryLink}
          </p>
        ) : (
          <form className="mt-8 space-y-5" method="post" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-800"
                htmlFor="new-password"
              >
                Nova senha
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                id="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-800"
                htmlFor="confirm-password"
              >
                Confirmar nova senha
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                id="confirm-password"
                minLength={8}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </div>
            {message ? (
              <p
                aria-live="polite"
                className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800"
                role="status"
              >
                {message}
              </p>
            ) : null}
            <button
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:opacity-60"
              disabled={isSubmitting || !isHydrated}
              type="submit"
            >
              {isHydrated ? (isSubmitting ? "Salvando…" : "Salvar nova senha") : "Carregando…"}
            </button>
          </form>
        )}
        <Link
          className="mt-6 inline-block text-sm font-medium text-indigo-700 underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-indigo-600"
          href="/admin/login"
        >
          Voltar para entrar
        </Link>
      </section>
    </main>
  );
}
