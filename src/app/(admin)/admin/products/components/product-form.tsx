"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { ProductCard } from "@/app/(public)/[storeSlug]/components/product-card";
import type { Asset } from "@/lib/assets/create-asset";
import type { AdminProduct } from "@/lib/products/product-row";
import type { PublicProduct } from "@/lib/public-catalog/query-public-catalog";
import { uploadProductImage } from "@/features/assets/upload-product-image";
import { saveProduct } from "@/features/products/save-product";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";

export type ProductFormValues = {
  name: string;
  sku: string;
  description: string;
  quantityAvailable: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues | "image", string>>;

export function validateProductFormValues(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Informe o nome do produto.";
  }

  if (!values.description.trim()) {
    errors.description = "Informe a descrição do produto.";
  }

  const quantity = Number(values.quantityAvailable);

  if (values.quantityAvailable.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
    errors.quantityAvailable = "Informe uma quantidade válida (maior ou igual a zero).";
  }

  return errors;
}

const UPLOAD_ERROR_MESSAGES: Record<"too_large" | "unsupported_format" | "service_error", string> =
  {
    too_large: "O arquivo excede o limite de 10 MB.",
    unsupported_format:
      "Formato de imagem não aceito. Envie um arquivo JPEG, PNG, WebP, HEIC ou HEIF.",
    service_error: "Não foi possível enviar a imagem agora. Tente novamente.",
  };

type ProductFormProps = {
  product?: AdminProduct;
  onSaved: (product: AdminProduct) => void;
  onCancel: () => void;
};

export function ProductForm({ product, onSaved, onCancel }: ProductFormProps) {
  const isHydrated = useIsHydrated();
  const [values, setValues] = useState<ProductFormValues>({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    quantityAvailable: product ? String(product.quantityAvailable) : "0",
  });
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [formError, setFormError] = useState<string>();
  // A freshly uploaded replacement image; the existing `product.imageAssetId`
  // stays the effective image until this is set, so a failed/skipped upload
  // never leaves the product without a valid image (FR-013).
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrors((current) => ({ ...current, image: undefined }));
    setIsUploadingImage(true);
    const result = await uploadProductImage(file);
    setIsUploadingImage(false);

    if (!result.ok) {
      setErrors((current) => ({ ...current, image: UPLOAD_ERROR_MESSAGES[result.kind] }));
      return;
    }

    setAsset(result.asset);
  }

  const imageAssetId = asset?.id ?? product?.imageAssetId;
  // Mirrors `imageAssetId` above: the freshly uploaded image takes precedence
  // over the product's current one, so editing without replacing the image
  // still previews it (specs/002-product-management/deltas/
  // product-image-preview.md).
  const previewImageUrl = asset?.publicUrl ?? product?.imageUrl;
  const parsedQuantity = Number(values.quantityAvailable);
  // Reuses the exact public `ProductCard` (docs/api/openapi.yaml PublicProduct
  // shape) so the preview is pixel-for-pixel what the storefront renders,
  // built from this form's own unsaved state rather than a fetch.
  const previewProduct: PublicProduct | null = previewImageUrl
    ? {
        id: product?.id ?? "preview",
        name: values.name.trim(),
        sku: values.sku.trim() ? values.sku.trim() : null,
        description: values.description.trim(),
        imageUrl: previewImageUrl,
        quantityAvailable:
          Number.isInteger(parsedQuantity) && parsedQuantity >= 0 ? parsedQuantity : 0,
        isOrderable: product?.isOrderable ?? false,
      }
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProductFormValues(values);

    if (!imageAssetId) {
      nextErrors.image = "Envie uma imagem do produto.";
    }

    setErrors(nextErrors);
    setFormError(undefined);

    if (Object.keys(nextErrors).length > 0 || !imageAssetId) {
      return;
    }

    setIsSubmitting(true);
    const result = await saveProduct(
      {
        name: values.name.trim(),
        sku: values.sku.trim() ? values.sku.trim() : null,
        description: values.description.trim(),
        imageAssetId,
        quantityAvailable: Number(values.quantityAvailable),
        isVisible: product?.isVisible ?? false,
        isOrderable: product?.isOrderable ?? false,
      },
      product?.id,
    );
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.kind === "sku_conflict") {
        setErrors((current) => ({
          ...current,
          sku: "Este SKU já está em uso por outro produto da loja.",
        }));
        return;
      }

      if (result.kind === "validation_error") {
        setErrors((current) => ({ ...current, ...result.fields }));
        setFormError("Confira os dados informados.");
        return;
      }

      setFormError("Não foi possível salvar agora. Tente novamente.");
      return;
    }

    onSaved(result.product);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="product-name">
          Nome
        </label>
        <input
          aria-describedby={errors.name ? "product-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="product-name"
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          type="text"
          value={values.name}
        />
        {errors.name ? (
          <p className="mt-2 text-sm text-red-700" id="product-name-error" role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="product-sku">
          SKU (opcional)
        </label>
        <input
          aria-describedby={errors.sku ? "product-sku-error" : undefined}
          aria-invalid={Boolean(errors.sku)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="product-sku"
          onChange={(event) => setValues((current) => ({ ...current, sku: event.target.value }))}
          type="text"
          value={values.sku}
        />
        {errors.sku ? (
          <p className="mt-2 text-sm text-red-700" id="product-sku-error" role="alert">
            {errors.sku}
          </p>
        ) : null}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-800"
          htmlFor="product-description"
        >
          Descrição
        </label>
        <textarea
          aria-describedby={errors.description ? "product-description-error" : undefined}
          aria-invalid={Boolean(errors.description)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="product-description"
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          rows={4}
          value={values.description}
        />
        {errors.description ? (
          <p className="mt-2 text-sm text-red-700" id="product-description-error" role="alert">
            {errors.description}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="product-quantity">
          Quantidade disponível
        </label>
        <input
          aria-describedby={errors.quantityAvailable ? "product-quantity-error" : undefined}
          aria-invalid={Boolean(errors.quantityAvailable)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="product-quantity"
          inputMode="numeric"
          min={0}
          onChange={(event) =>
            setValues((current) => ({ ...current, quantityAvailable: event.target.value }))
          }
          type="number"
          value={values.quantityAvailable}
        />
        {errors.quantityAvailable ? (
          <p className="mt-2 text-sm text-red-700" id="product-quantity-error" role="alert">
            {errors.quantityAvailable}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="product-image">
          {product ? "Substituir imagem do produto (opcional)" : "Imagem do produto"}
        </label>
        {product && !asset ? (
          <p className="mb-2 text-sm text-slate-600">
            A imagem atual será mantida até que uma nova seja enviada com sucesso.
          </p>
        ) : null}
        <input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          aria-describedby={errors.image ? "product-image-error" : undefined}
          aria-invalid={Boolean(errors.image)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="product-image"
          onChange={handleImageChange}
          type="file"
        />
        {isUploadingImage ? (
          <p className="mt-2 text-sm text-slate-600" role="status">
            Enviando imagem…
          </p>
        ) : null}
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, no next/image remote pattern configured yet.
          <img
            alt="Pré-visualização da imagem do produto"
            className="mt-3 h-32 w-32 rounded-xl object-cover"
            src={asset.publicUrl}
          />
        ) : null}
        {errors.image ? (
          <p className="mt-2 text-sm text-red-700" id="product-image-error" role="alert">
            {errors.image}
          </p>
        ) : null}
      </div>

      {previewProduct ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-800">Pré-visualização no catálogo</h3>
          {/* Deliberately not a <ul>: the products list elsewhere on this page
              (product-list.tsx) is queried by role "listitem" in e2e specs,
              and this unsaved preview must never be mistaken for a persisted
              entry there. Outside a list/ol/menu context, `ProductCard`'s
              root <li> has no implicit ARIA listitem role (HTML-AAM), so it
              can't collide with those queries. */}
          <div className="max-w-xs">
            <ProductCard product={previewProduct} />
          </div>
        </div>
      ) : null}

      {formError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting || isUploadingImage || !isHydrated}
          type="submit"
        >
          {isHydrated
            ? isSubmitting
              ? "Salvando…"
              : product
                ? "Salvar alterações"
                : "Salvar produto"
            : "Carregando…"}
        </button>
        <button
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
