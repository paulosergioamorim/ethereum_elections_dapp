import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Cria uma eleição numa ElectionFactory já implantada.
 *
 * O Election não é implantado direto: cada eleição é um clone criado por `createElection`, e a
 * implementação base (criada pela factory) não pode ser inicializada. Este módulo chama a factory e
 * pega o endereço do clone no evento `ElectionCreated`.
 *
 * Pré-requisito: pelo menos um eleitor cadastrado na factory, senão `createElection` reverte com
 * InvalidMerkleRoot. A eleição congela os eleitores cadastrados até este momento.
 *
 * Parâmetros obrigatórios (modelo em ignition/parameters/election.example.json):
 * - `factory`: endereço da ElectionFactory (em ignition/deployments/<id>/deployed_addresses.json);
 * - `title` e `candidates` (2 ou mais);
 * - `votingStart` e `votingEnd`: timestamps Unix em segundos. O início não pode estar no passado
 *   quando a transação for minerada, e o fim tem que ser depois do início.
 *
 * O Ignition não repete uma chamada já feita na mesma implantação, então cada eleição é uma
 * implantação com o seu próprio `--deployment-id`:
 *
 * pnpm hardhat ignition deploy ignition/modules/Election.ts --network sepolia \
 *   --parameters ignition/parameters/election.json --deployment-id sepolia-eleicao-1
 */
export default buildModule("ElectionModule", (m) => {
  const factory = m.contractAt("ElectionFactory", m.getParameter<string>("factory"));

  const creation = m.call(factory, "createElection", [
    {
      title: m.getParameter<string>("title"),
      candidates: m.getParameter<string[]>("candidates"),
      votingStart: m.getParameter<bigint>("votingStart"),
      votingEnd: m.getParameter<bigint>("votingEnd"),
    },
  ]);

  const electionAddress = m.readEventArgument(creation, "ElectionCreated", "election");
  const election = m.contractAt("Election", electionAddress);

  return { factory, election };
});
