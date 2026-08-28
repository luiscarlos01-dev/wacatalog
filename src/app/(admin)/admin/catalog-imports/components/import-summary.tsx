import type { LocalCatalogImportCandidate } from "./candidate-review-item";

type ImportSummaryProps = {
  candidates: LocalCatalogImportCandidate[];
  isConfirming: boolean;
  onRetryFailed: () => void;
};

export function ImportSummary({ candidates, isConfirming, onRetryFailed }: ImportSummaryProps) {
  const created = candidates.filter((candidate) => candidate.confirmedProductId).length;
  const duplicates = candidates.filter((candidate) => candidate.isDuplicateSku).length;
  const failed = candidates.filter(
    (candidate) => !candidate.isDuplicateSku && Boolean(candidate.confirmError),
  ).length;

  return (
    <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm" role="status">
      <h3 className="text-sm font-semibold text-slate-800">Resultado da importação</h3>
      <ul className="space-y-1 text-sm text-slate-700">
        <li>{created} produto(s) criado(s) com sucesso.</li>
        {duplicates > 0 ? <li>{duplicates} item(ns) ignorado(s) por SKU já cadastrado.</li> : null}
        {failed > 0 ? (
          <li>{failed} item(ns) não confirmado(s) — corrija e tente novamente.</li>
        ) : null}
      </ul>
      {failed > 0 ? (
        <button
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
          disabled={isConfirming}
          onClick={onRetryFailed}
          type="button"
        >
          {isConfirming ? "Tentando novamente…" : "Tentar novamente os itens que falharam"}
        </button>
      ) : null}
    </div>
  );
}
