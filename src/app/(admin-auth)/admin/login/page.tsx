import { RecoveryLink } from "@/app/(admin-auth)/admin/login/components/recovery-link";
import { LoginForm } from "@/features/auth/login-form";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const authorization = await getAuthenticatedStore();

  if (authorization.ok) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Wacatalog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Entrar no painel
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Use o email e a senha fornecidos pelo mantenedor da sua loja.
        </p>
        <noscript>
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950" role="alert">
            Esta área precisa de JavaScript habilitado para funcionar.
          </p>
        </noscript>
        <div className="mt-8">
          <LoginForm />
        </div>
        <RecoveryLink />
      </section>
    </main>
  );
}
