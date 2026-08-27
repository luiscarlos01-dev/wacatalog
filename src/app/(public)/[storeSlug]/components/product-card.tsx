import type { PublicProduct } from "@/lib/public-catalog/query-public-catalog";

type ProductCardProps = {
  product: PublicProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, no next/image remote pattern configured yet. */}
      <img
        alt={`Imagem do produto ${product.name}`}
        className="h-48 w-full object-cover"
        src={product.imageUrl}
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="font-semibold text-slate-950">{product.name}</h2>
        {product.sku ? <p className="text-sm text-slate-600">SKU: {product.sku}</p> : null}
        <p className="flex-1 text-sm leading-6 text-slate-700">{product.description}</p>
        <span
          className={
            product.isOrderable
              ? "w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase"
              : "w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 uppercase"
          }
        >
          {product.isOrderable ? "Disponível para pedido" : "Indisponível no momento"}
        </span>
      </div>
    </li>
  );
}
