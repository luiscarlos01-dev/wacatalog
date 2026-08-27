import { notFound } from "next/navigation";

import { getPublicCatalog } from "@/features/public-catalog/get-public-catalog";

import { EmptyCatalog } from "./components/empty-catalog";
import { HeroBanners } from "./components/hero-banners";
import { ProductCard } from "./components/product-card";

export const dynamic = "force-dynamic";

type StoreCatalogPageParams = { params: Promise<{ storeSlug: string }> };

export default async function StoreCatalogPage({ params }: StoreCatalogPageParams) {
  const { storeSlug } = await params;
  const result = await getPublicCatalog(storeSlug);

  if (!result.ok) {
    if (result.kind === "not_found") {
      notFound();
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200">
          <h1 className="text-2xl font-semibold text-slate-950">
            Não foi possível carregar a loja
          </h1>
          <p className="mt-3 leading-7 text-slate-600">Tente novamente em alguns instantes.</p>
        </section>
      </main>
    );
  }

  const { store, products, banners } = result.catalog;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{store.name}</h1>
        </header>

        {banners.length > 0 ? <HeroBanners banners={banners} /> : null}

        <section className="mt-6">
          {products.length > 0 ? (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          ) : (
            <EmptyCatalog />
          )}
        </section>
      </div>
    </main>
  );
}
