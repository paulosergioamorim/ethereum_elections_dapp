// API pública das eleições: o resto do app importa daqui.
export { ElectionList } from "./components/election-list";
export { ElectionStats } from "./components/election-stats";
export { ResultsCard } from "./components/results-card";
export { VoteCard } from "./components/vote-card";
export {
  useElection,
  useElectionGroup,
  useElectionResults,
  useElections,
  useVote,
  useVoteEligibility,
  type VoteEligibility,
  type VoteStep,
} from "./hooks";
export { electionKeys } from "./keys";
export { formatCountdown, formatTimestamp, phaseAt, phaseLabels, type ElectionPhase } from "./phase";
export {
  ElectionNotFoundError,
  electionGroupQueryOptions,
  electionQueryOptions,
  electionResultsQueryOptions,
  electionsQueryOptions,
  type ElectionDetails,
  type ElectionResults,
} from "./queries";
