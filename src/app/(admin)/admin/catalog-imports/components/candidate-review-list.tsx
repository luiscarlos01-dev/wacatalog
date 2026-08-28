import { CandidateReviewItem, type LocalCatalogImportCandidate } from "./candidate-review-item";

type CandidateReviewListProps = {
  candidates: LocalCatalogImportCandidate[];
  onChange: (localId: string, patch: Partial<LocalCatalogImportCandidate>) => void;
  storeId: string;
};

export function CandidateReviewList({ candidates, onChange, storeId }: CandidateReviewListProps) {
  if (candidates.length === 0) {
    // FR-011: a valid PDF from which nothing could be extracted is not an
    // error — a clear, non-technical message instead (spec.md US1 scenario 4).
    return (
      <p className="rounded-3xl bg-white p-8 text-center leading-7 text-slate-600 shadow-sm">
        Nenhum produto foi encontrado neste PDF.
      </p>
    );
  }

  return (
    <ul aria-label="Produtos extraídos do PDF" className="space-y-3">
      {candidates.map((candidate) => (
        <CandidateReviewItem
          candidate={candidate}
          key={candidate.localId}
          onChange={onChange}
          storeId={storeId}
        />
      ))}
    </ul>
  );
}
