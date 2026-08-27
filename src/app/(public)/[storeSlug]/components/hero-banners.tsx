import type { PublicBanner } from "@/lib/public-catalog/query-public-catalog";

type HeroBannersProps = {
  banners: PublicBanner[];
};

export function HeroBanners({ banners }: HeroBannersProps) {
  return (
    <section aria-label="Destaques da loja" className="mt-6 flex flex-col gap-4">
      {banners.map((banner) => (
        <figure className="overflow-hidden rounded-3xl bg-white shadow-sm" key={banner.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, no next/image remote pattern configured yet. */}
          <img
            alt={banner.accessibleDescription}
            className="h-40 w-full object-cover sm:h-56"
            src={banner.imageUrl}
          />
          {banner.title || banner.text ? (
            <figcaption className="p-5">
              {banner.title ? (
                <p className="text-lg font-semibold text-slate-950">{banner.title}</p>
              ) : null}
              {banner.text ? <p className="mt-1 text-sm text-slate-700">{banner.text}</p> : null}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </section>
  );
}
