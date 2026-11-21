import type { Address } from "viem";
import { CandidateList } from "./candidate-list";
import { CreateCandidateCard } from "./create-candidate-card";

/** Candidatos do partido; o presidente também vê o formulário para criar. */
export function CandidatesSection({ party, isPresident }: { party: Address; isPresident: boolean }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Candidatos</h2>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CandidateList party={party} />
        {isPresident && <CreateCandidateCard party={party} />}
      </div>
    </section>
  );
}
