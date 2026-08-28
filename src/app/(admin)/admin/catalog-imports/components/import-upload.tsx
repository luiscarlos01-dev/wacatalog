"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { AdminProduct } from "@/lib/products/product-row";
import { confirmCandidate, importCatalog } from "@/features/catalog-import/import-catalog";

import { toLocalCandidate, type LocalCatalogImportCandidate } from "./candidate-review-item";
import { CandidateReviewList } from "./candidate-review-list";
import { ImportSummary } from "./import-summary";

type ImportUploadProps = {
  storeId: string;
  onCancel: () => void;
  onProductsCreated: (products: AdminProduct[]) => void;
};

export function ImportUpload({ storeId, onCancel, onProductsCreated }: ImportUploadProps) {
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>();
  const [candidates, setCandidates] = useState<LocalCatalogImportCandidate[] | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasAttemptedConfirm, setHasAttemptedConfirm] = useState(false);
  // US3: canceling unmounts this component (product-list.tsx renders it
  // conditionally), which would otherwise leave an in-flight `runConfirm`
  // loop updating state after unmount.
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Selecione um arquivo PDF.");
      return;
    }

    setError(undefined);
    setIsProcessing(true);
    const result = await importCatalog(storeId, file);
    setIsProcessing(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setCandidates(result.candidates.map(toLocalCandidate));
  }

  function handleCandidateChange(localId: string, patch: Partial<LocalCatalogImportCandidate>) {
    if (!isMountedRef.current) {
      return;
    }

    setCandidates(
      (current) =>
        current?.map((candidate) =>
          candidate.localId === localId ? { ...candidate, ...patch } : candidate,
        ) ?? null,
    );
  }

  // FR-010/FR-013: runs sequentially, never stopping on an individual
  // failure — every target is attempted, success and failure both update
  // just that candidate's own state (import-catalog.ts confirmCandidate).
  async function runConfirm(targets: LocalCatalogImportCandidate[]) {
    setIsConfirming(true);

    for (const candidate of targets) {
      handleCandidateChange(candidate.localId, { isConfirming: true, confirmError: undefined });

      const outcome = await confirmCandidate({
        name: candidate.name,
        sku: candidate.sku,
        description: candidate.description,
        imageAssetId: candidate.image?.id,
      });

      if (outcome.ok) {
        handleCandidateChange(candidate.localId, {
          isConfirming: false,
          confirmedProductId: outcome.product.id,
        });

        if (isMountedRef.current) {
          onProductsCreated([outcome.product]);
        }
      } else {
        handleCandidateChange(candidate.localId, {
          isConfirming: false,
          confirmError: outcome.message,
        });
      }
    }

    if (isMountedRef.current) {
      setIsConfirming(false);
    }
  }

  function confirmableCandidates(source: LocalCatalogImportCandidate[]) {
    return source.filter((candidate) => !candidate.isDuplicateSku && !candidate.confirmedProductId);
  }

  async function handleConfirmAll() {
    if (!candidates) {
      return;
    }

    setHasAttemptedConfirm(true);
    await runConfirm(confirmableCandidates(candidates));
  }

  async function handleRetryFailed() {
    if (!candidates) {
      return;
    }

    await runConfirm(candidates.filter((candidate) => Boolean(candidate.confirmError)));
  }

  if (candidates) {
    const pendingCount = confirmableCandidates(candidates).length;

    return (
      <div className="space-y-4">
        <CandidateReviewList
          candidates={candidates}
          onChange={handleCandidateChange}
          storeId={storeId}
        />
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isConfirming || pendingCount === 0}
            onClick={handleConfirmAll}
            type="button"
          >
            {isConfirming ? "Confirmando…" : "Confirmar importação"}
          </button>
          {/* US3: cancel is only meaningful before/between confirmations —
              once a confirm run is in flight, some products may already
              exist, so "nothing happened" no longer holds (spec.md scopes
              cancel to "antes de confirmar"). */}
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            Cancelar importação
          </button>
        </div>
        {hasAttemptedConfirm ? (
          <ImportSummary
            candidates={candidates}
            isConfirming={isConfirming}
            onRetryFailed={handleRetryFailed}
          />
        ) : null}
      </div>
    );
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor={fileInputId}>
          Arquivo PDF do catálogo
        </label>
        <input
          accept="application/pdf"
          aria-describedby={error ? `${fileInputId}-error` : undefined}
          aria-invalid={Boolean(error)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id={fileInputId}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        {error ? (
          <p className="mt-2 text-sm text-red-700" id={`${fileInputId}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {isProcessing ? (
        <p className="text-sm text-slate-600" role="status">
          Processando PDF…
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
          disabled={isProcessing}
          type="submit"
        >
          {isProcessing ? "Processando…" : "Enviar PDF"}
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
