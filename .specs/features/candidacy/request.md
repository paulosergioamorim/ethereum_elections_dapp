# Request (verbatim)

/tlc-spec-lean Agora implemente um contrato Candidacy (que é um contrato associativo n:n entre Eleição e Candidato), Canidacy deve substituir o array de strings na eleição. Adicione um novo estado na eleição em que os partidos possam publicar os candidatos na eleição (um único por partido). Um candidato não pode concorrer em mais de uma eleição ao mesmo tempo

Captures: none.

## Answers (2026-11-21)

- Scope: contracts + adapt the frontend (form without names, vote/tally read Candidacy, president action "Indicar candidato" on the election page).
- Phase: new `candidacyEnd` deadline; Candidacy (creation → candidacyEnd) → Scheduled (→ votingStart) → Voting → Tally; candidacyEnd above now and <= votingStart.
- Nomination: the party's president nominates a candidate of their own party; may replace/withdraw while Candidacy lasts; frozen afterwards.
- Simultaneity: a candidate is held from the nomination until votingEnd (Tally starts); withdrawn/replaced nomination frees them.
- Minimum: none on-chain; voting proceeds with any number of nominees (0, 1 or more).

## Follow-up (2026-11-21)

- User: "a candidatura também pode receber doações."
- Donations: each candidacy (election + candidate) is a clone contract with its own balance (DonationHolder); owner = the candidate's wallet, who withdraws.
- Withdrawing/replacing a nomination with balance: the balance stays withdrawable by the candidate wallet, the nomination leaves the list and new donations are refused.
- Registry: user asked "faça tudo no ElectionFactory": no separate CandidacyRegistry; nominate/withdraw/lists/holding live in ElectionFactory.
