import { SignOutButton } from "@/app/(admin)/admin/components/sign-out-button";
import { getAdminStore } from "@/features/store-access/get-admin-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await getAdminStore();

  if (!result.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
          <h1 className="text-2xl font-semibold text-slate-950">
            Não foi possível carregar a loja
          </h1>
          <p className="mt-3 leading-7 text-slate-600">Tente novamente ou fale com o mantenedor.</p>
          <SignOutButton />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
              Painel da loja
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {result.value.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">/{result.value.slug}</p>
          </div>
          <SignOutButton />
        </header>
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Acesso configurado</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Sua conta está associada somente a esta loja. As ferramentas de produtos e banners serão
            adicionadas nas próximas etapas.
          </p>
        </section>
      </div>
    </main>
  );
}
