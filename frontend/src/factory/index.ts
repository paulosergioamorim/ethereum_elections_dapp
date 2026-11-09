// API pública da factory: leituras e ações (da autoridade e do eleitor).
export {
  useAuthority,
  useAuthorizeVoters,
  useCreateElection,
  useFactoryInfo,
  useRegisterIdentity,
  useRemoveVoter,
  useVoterStatus,
  useVoters,
  type CreateElectionInput,
  type RegisterStep,
} from "./hooks";
export {
  factoryInfoQueryOptions,
  factoryKeys,
  fetchVoterGroup,
  voterStatusQueryOptions,
  votersQueryOptions,
  type FactoryInfo,
  type GroupSnapshot,
  type Voter,
  type VoterStatus,
} from "./queries";
