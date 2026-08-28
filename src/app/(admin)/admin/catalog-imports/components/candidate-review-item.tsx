"use client";

import { useId } from "react";
import type { ChangeEvent } from "react";

import type { Asset } from "@/lib/assets/create-asset";
import type { FlaggedCatalogImportCandidate } from "@/lib/catalog-import/flag-duplicate-skus";
import { uploadProductImage } from "@/features/assets/upload-product-image";

// Candidates have no server id (ADR-0008: ephemeral, never persisted before
// confirmation) — the client assigns this key locally for list rendering and
// per-item state (research.md, "candidato extraído não tem identificador de
// servidor"). Editable fields (name/sku/description) and the attached image
// live here too, since editing is scoped to one candidate at a time
// (spec.md US2).
export type LocalCatalogImportCandidate = FlaggedCatalogImportCandidate & {
  localId: string;
  image: Asset | null;
  isUploadingImage: boolean;
  imageError?: string;
  isConfirming: boolean;
  confirmError?: string;
  confirmedProductId?: string;
};

export function toLocalCandidate(
  candidate: FlaggedCatalogImportCandidate,
): LocalCatalogImportCandidate {
  return {
    ...candidate,
    localId: crypto.randomUUID(),
    image: null,
    isUploadingImage: false,
    isConfirming: false,
  };
}

const UPLOAD_ERROR_MESSAGES: Record<"too_large" | "unsupported_format" | "service_error", string> =
  {
    too_large: "O arquivo excede o limite de 10 MB.",
    unsupported_format:
      "Formato de imagem não aceito. Envie um arquivo JPEG, PNG, WebP, HEIC ou HEIF.",
    service_error: "Não foi possível enviar a imagem agora. Tente novamente.",
  };

type CandidateReviewItemProps = {
  candidate: LocalCatalogImportCandidate;
  onChange: (localId: string, patch: Partial<LocalCatalogImportCandidate>) => void;
  storeId: string;
};

export function CandidateReviewItem({ candidate, onChange, storeId }: CandidateReviewItemProps) {
  const nameId = useId();
  const skuId = useId();
  const descriptionId = useId();
  const imageId = useId();

  // FR-005: a duplicate is never created nor updated — read-only, resolving
  // it is out of scope for the import flow (spec.md Assumptions).
  if (candidate.isDuplicateSku) {
    return (
      <li className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">{candidate.name}</p>
            {candidate.sku ? <p className="text-sm text-slate-600">SKU: {candidate.sku}</p> : null}
            <p className="text-sm text-slate-700">
              {candidate.description.trim() ? candidate.description : "Sem descrição."}
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800 uppercase">
            SKU já cadastrado
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Este item não será importado. Para atualizar o produto existente, use a edição normal de
          produtos.
        </p>
      </li>
    );
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onChange(candidate.localId, { isUploadingImage: true, imageError: undefined });
    const result = await uploadProductImage(storeId, file);

    if (!result.ok) {
      onChange(candidate.localId, {
        isUploadingImage: false,
        imageError: UPLOAD_ERROR_MESSAGES[result.kind],
      });
      return;
    }

    onChange(candidate.localId, { isUploadingImage: false, image: result.asset });
  }

  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={nameId}>
            Nome
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            id={nameId}
            onChange={(event) => onChange(candidate.localId, { name: event.target.value })}
            type="text"
            value={candidate.name}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={skuId}>
            SKU (opcional)
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            id={skuId}
            onChange={(event) => onChange(candidate.localId, { sku: event.target.value || null })}
            type="text"
            value={candidate.sku ?? ""}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={descriptionId}>
            Descrição
          </label>
          <textarea
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            id={descriptionId}
            onChange={(event) => onChange(candidate.localId, { description: event.target.value })}
            rows={3}
            value={candidate.description}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={imageId}>
            Imagem do produto
          </label>
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            aria-describedby={candidate.imageError ? `${imageId}-error` : undefined}
            aria-invalid={Boolean(candidate.imageError)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            id={imageId}
            onChange={handleImageChange}
            type="file"
          />
          {candidate.isUploadingImage ? (
            <p className="mt-2 text-sm text-slate-600" role="status">
              Enviando imagem…
            </p>
          ) : null}
          {candidate.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, no next/image remote pattern configured yet.
            <img
              alt={`Pré-visualização da imagem de ${candidate.name || "produto importado"}`}
              className="mt-3 h-24 w-24 rounded-xl object-cover"
              src={candidate.image.publicUrl}
            />
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Uma imagem é obrigatória para confirmar este item.
            </p>
          )}
          {candidate.imageError ? (
            <p className="mt-2 text-sm text-red-700" id={`${imageId}-error`} role="alert">
              {candidate.imageError}
            </p>
          ) : null}
        </div>

        {candidate.confirmedProductId ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            Produto criado com sucesso.
          </p>
        ) : null}
        {candidate.confirmError ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {candidate.confirmError}
          </p>
        ) : null}
      </div>
    </li>
  );
}
