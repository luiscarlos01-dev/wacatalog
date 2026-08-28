"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { confirmStoreWhatsapp } from "@/features/store-access/confirm-store-whatsapp";
import { updateStoreWhatsapp } from "@/features/store-access/update-store-whatsapp";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import type { AdminStore } from "@/lib/store/get-admin-store";

type WhatsappSettingsProps = {
  store: AdminStore;
};

const STATUS_LABEL: Record<AdminStore["whatsappVerificationStatus"], string> = {
  unverified: "Não confirmado",
  verified: "Confirmado",
};

function formatVerifiedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function WhatsappSettings({ store: initialStore }: WhatsappSettingsProps) {
  const isHydrated = useIsHydrated();
  const [store, setStore] = useState(initialStore);
  const [numberInput, setNumberInput] = useState(store.whatsappNumber ?? "");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);
    setFormError(undefined);
    setConfirmError(undefined);

    if (!numberInput.trim()) {
      setFieldError("Informe o número de WhatsApp.");
      return;
    }

    setIsSaving(true);
    const result = await updateStoreWhatsapp(numberInput.trim());
    setIsSaving(false);

    if (!result.ok) {
      if (result.kind === "validation_error") {
        setFieldError(
          result.message ?? "Informe um número de WhatsApp brasileiro válido, com DDD.",
        );
        return;
      }

      setFormError("Não foi possível salvar agora. Tente novamente.");
      return;
    }

    setStore(result.store);
    setNumberInput(result.store.whatsappNumber ?? "");
  }

  async function handleConfirm() {
    setConfirmError(undefined);
    setIsConfirming(true);
    const result = await confirmStoreWhatsapp();
    setIsConfirming(false);

    if (!result.ok) {
      setConfirmError(
        result.kind === "no_number"
          ? "Configure um número de WhatsApp antes de confirmar a verificação."
          : "Não foi possível confirmar agora. Tente novamente.",
      );
      return;
    }

    setStore(result.store);
  }

  function handleTest() {
    if (!store.whatsappNumber) {
      return;
    }

    // FR-005: no pre-filled message — a real test message could be mistaken
    // for a genuine order if sent by accident.
    window.open(`https://wa.me/${store.whatsappNumber}`, "_blank", "noopener,noreferrer");
  }

  const verifiedAt = formatVerifiedAt(store.whatsappVerifiedAt);

  return (
    <section
      aria-labelledby="whatsapp-settings-heading"
      className="rounded-3xl bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-950" id="whatsapp-settings-heading">
        WhatsApp da loja
      </h2>
      <p className="mt-1 text-sm text-slate-600">Número usado para receber pedidos dos clientes.</p>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="font-medium text-slate-800">Número atual</dt>
          <dd className="mt-1 text-slate-700">{store.whatsappNumber ?? "Não configurado"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-800">Status</dt>
          <dd aria-live="polite" className="mt-1 text-slate-700">
            {STATUS_LABEL[store.whatsappVerificationStatus]}
            {verifiedAt ? ` em ${verifiedAt}` : ""}
          </dd>
        </div>
      </dl>

      <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-800"
            htmlFor="whatsapp-number"
          >
            Número de WhatsApp
          </label>
          <input
            aria-describedby={fieldError ? "whatsapp-number-error" : undefined}
            aria-invalid={Boolean(fieldError)}
            className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            id="whatsapp-number"
            onChange={(event) => setNumberInput(event.target.value)}
            placeholder="(11) 91234-5678"
            type="tel"
            value={numberInput}
          />
          {fieldError ? (
            <p className="mt-2 text-sm text-red-700" id="whatsapp-number-error" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving || !isHydrated}
            type="submit"
          >
            {isHydrated ? (isSaving ? "Salvando…" : "Salvar número") : "Carregando…"}
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!store.whatsappNumber || !isHydrated}
            onClick={handleTest}
            type="button"
          >
            Testar número
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
            // Not gated on `store.whatsappNumber` like "Testar número": FR-007
            // requires a clear rejection message when the admin attempts to
            // confirm with no number configured, not a disabled control.
            disabled={isConfirming || !isHydrated}
            onClick={handleConfirm}
            type="button"
          >
            {isConfirming ? "Confirmando…" : "Confirmar verificação"}
          </button>
        </div>

        {confirmError ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {confirmError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
