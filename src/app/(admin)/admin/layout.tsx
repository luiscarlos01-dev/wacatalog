import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthErrorDefinition } from "@/lib/auth/auth-errors";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";

export const dynamic = "force-dynamic";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const authorization = await getAuthenticatedStore();

  if (!authorization.ok && authorization.code === "unauthenticated") {
    redirect("/admin/login");
  }

  if (!authorization.ok && authorization.code === "service_unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
          <h1 className="text-2xl font-semibold text-slate-950">
            Não foi possível carregar o painel
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {getAuthErrorDefinition("service_unavailable").message}
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate hard reload: a soft Link navigation to this same URL isn't guaranteed to re-run the fetch that just failed. */}
          <a
            className="mt-6 inline-block rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-600"
            href="/admin"
          >
            Tentar novamente
          </a>
        </section>
      </main>
    );
  }

  if (!authorization.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
          <h1 className="text-2xl font-semibold text-slate-950">Acesso não autorizado</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Esta conta não está associada a uma loja administrável. Fale com o mantenedor para pedir
            ajuda.
          </p>
          <Link
            className="mt-6 inline-block rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-600"
            href="/admin/login"
          >
            Voltar para entrar
          </Link>
        </section>
      </main>
    );
  }

  return children;
}
