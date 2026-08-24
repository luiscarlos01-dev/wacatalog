"use client";

import { useEffect, useRef } from "react";

type DeleteProductDialogProps = {
  productName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteProductDialog({
  productName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteProductDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    cancelButtonRef.current?.focus();

    // The native `cancel` event fires on Escape before `close`; owning the
    // state transition through `onCancel` keeps a single source of truth
    // instead of also reacting to `close`.
    function handleCancelEvent(event: Event) {
      event.preventDefault();
      onCancel();
    }

    dialog.addEventListener("cancel", handleCancelEvent);

    return () => {
      dialog.removeEventListener("cancel", handleCancelEvent);
    };
  }, [onCancel]);

  return (
    <dialog
      aria-labelledby="delete-product-dialog-title"
      className="rounded-3xl p-0 shadow-xl backdrop:bg-slate-950/50"
      ref={dialogRef}
    >
      <div className="max-w-md space-y-5 p-6">
        <h2 className="text-lg font-semibold text-slate-950" id="delete-product-dialog-title">
          Excluir produto
        </h2>
        <p className="leading-7 text-slate-700">
          Tem certeza de que deseja excluir definitivamente o produto &quot;{productName}&quot;?
          Essa ação não pode ser desfeita. Para apenas ocultá-lo e preservá-lo, use
          &quot;Desativar&quot;.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? "Excluindo…" : "Excluir definitivamente"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
