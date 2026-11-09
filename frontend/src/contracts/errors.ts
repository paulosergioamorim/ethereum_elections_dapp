import { BaseError, ContractFunctionRevertedError, decodeErrorResult, type Hex } from "viem";
import { electionAbi, electionFactoryAbi, semaphoreAbi } from "./abis";

/** Erros dos contratos em português, para o usuário entender o que fazer. */
const messages: Record<string, string> = {
  // ElectionFactory e Ownable
  OwnableUnauthorizedAccount: "Só a conta dona da factory pode fazer isso.",
  InvalidVoterAddress: "Há um endereço de eleitor inválido na lista.",
  UnauthorizedVoter: "Esta carteira não está autorizada a votar.",
  CommitmentCannotBeZero: "A identidade do eleitor é inválida.",
  AlreadyRegisteredIdentityCommitment: "Esta carteira já cadastrou uma identidade.",
  RenounceDisabled: "A factory não pode ficar sem dono.",
  // Election
  InvalidMerkleRoot:
    "Ainda não há eleitores cadastrados. Cadastre pelo menos um antes de criar a eleição.",
  InvalidVotingStart: "O início da votação já passou. Escolha um horário no futuro.",
  InvalidVotingDuration: "O fim da votação precisa ser depois do início.",
  InvalidCandidatesQuantity: "A eleição precisa de pelo menos 2 candidatos.",
  InvalidInitialization: "Esta eleição já foi inicializada.",
  InvalidPhase: "A eleição não está na fase certa para isso.",
  MerkleRootMismatch: "A lista de eleitores usada na prova não é a desta eleição.",
  InvalidScope: "A prova foi feita para outra eleição.",
  InvalidMessage: "A prova não corresponde a esta cédula.",
  // Semaphore (prova e nullifier)
  Semaphore__YouAreUsingTheSameNullifierTwice: "Você já votou nesta eleição.",
  Semaphore__InvalidProof: "A prova de voto não foi aceita pelo contrato.",
  Semaphore__MerkleTreeDepthIsNotSupported: "A prova foi gerada para uma árvore de tamanho não suportado.",
  // Semaphore (LeanIMT)
  WrongSiblingNodes: "A lista de eleitores mudou enquanto a remoção era preparada. Tente de novo.",
  LeafAlreadyExists: "Esta identidade já está cadastrada no grupo.",
  LeafDoesNotExist: "Esta identidade não está no grupo de eleitores.",
};

/**
 * Nome do erro do contrato que reverteu a chamada. Os erros do Election e do Semaphore sobem pela
 * factory sem estar na ABI dela, então o dado bruto é decodificado com as outras ABIs também.
 */
export function contractErrorName(error: unknown): string | undefined {
  if (!(error instanceof BaseError)) {
    return undefined;
  }

  const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);

  if (!(reverted instanceof ContractFunctionRevertedError)) {
    return undefined;
  }

  if (reverted.data?.errorName) {
    return reverted.data.errorName;
  }

  const raw = reverted.raw as Hex | undefined;

  if (!raw) {
    return undefined;
  }

  for (const abi of [electionFactoryAbi, electionAbi, semaphoreAbi]) {
    try {
      return decodeErrorResult({ abi, data: raw }).errorName;
    } catch {
      // não é um erro desta ABI: tenta a próxima
    }
  }

  return undefined;
}

/** Mensagem em português do erro do contrato, se ele for conhecido. */
export function contractErrorMessage(error: unknown): string | undefined {
  const name = contractErrorName(error);

  return name ? messages[name] : undefined;
}
