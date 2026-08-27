type ProductThumbnailProps = {
  productName: string;
  imageUrl: string;
  className: string;
};

// Shared image block for the public catalog's `ProductCard` and the admin
// product list item (specs/002-product-management/deltas/
// product-image-preview.md): only the `<img>` + alt/class handling is
// shared, not the surrounding card/list layout, which differs between the
// two contexts.
export function ProductThumbnail({ productName, imageUrl, className }: ProductThumbnailProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, no next/image remote pattern configured yet.
    <img alt={`Imagem do produto ${productName}`} className={className} src={imageUrl} />
  );
}
