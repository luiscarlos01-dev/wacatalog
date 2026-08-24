import Link from "next/link";

import { RecoveryForm } from "@/features/auth/recovery-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Wacatalog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Recuperar acesso
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Informe seu email para receber um link seguro. Você não precisa enviar sua senha a
          ninguém.
        </p>
        <noscript>
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950" role="alert">
            Esta área precisa de JavaScript habilitado para funcionar.
          </p>
        </noscript>
        <div className="mt-8">
          <RecoveryForm />
        </div>
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
