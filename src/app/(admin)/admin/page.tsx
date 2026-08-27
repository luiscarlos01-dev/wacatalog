import { SignOutButton } from "@/app/(admin)/admin/components/sign-out-button";
import { ProductList } from "@/app/(admin)/admin/products/components/product-list";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { listProducts } from "@/lib/products/list-products";
import { queryAdminStore } from "@/lib/store/get-admin-store";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getServerSupabaseClient();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
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

  // Independent, unrelated reads on the resolved store: run concurrently
  // instead of forcing the products list to wait on the store header.
  const [storeResult, productsResult] = await Promise.all([
    queryAdminStore(supabase, authorization.value.storeId),
    listProducts(supabase, authorization.value.storeId),
  ]);

  if (!storeResult.ok) {
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
              {storeResult.store.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">/{storeResult.store.slug}</p>
          </div>
          <SignOutButton />
        </header>
        <section className="mt-6">
          {productsResult.ok ? (
            <ProductList
              initialProducts={productsResult.items}
              storeId={authorization.value.storeId}
            />
          ) : (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm" role="alert">
              <p className="text-lg font-semibold text-slate-950">
                Não foi possível carregar os produtos
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Tente novamente ou fale com o mantenedor.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
