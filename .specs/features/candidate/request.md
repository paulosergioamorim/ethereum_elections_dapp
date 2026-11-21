# Request (verbatim)

/tlc-spec-lean crie agora o contrato e o frontend para o `Canidate`, o partido cria o candidato

Captures: none.

## Answers (2026-11-21)

- Model: Party creates a `Candidate` contract (`new Candidate`), only the president calls it.
- Fields: name + number (imutáveis).
- Lifecycle: user wrote "O candidato também pode receber doações" (in place of create/list/remove options): Candidate implements `IDonatable` too.
- Election link: no, out of scope.
- Withdraw: the candidate's own wallet (owner of the Candidate contract).
- Number: user wrote "sem número de partidos", clarified as "Candidato sem número": no number field, only name + wallet.
- Screens: party page + candidate page.
