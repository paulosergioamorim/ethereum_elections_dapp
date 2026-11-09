// API pública das eleições: o resto do app importa daqui.
export { BallotsCard } from "./components/ballots-card";
export { ElectionList } from "./components/election-list";
export { ElectionStats } from "./components/election-stats";
export { ResultsCard } from "./components/results-card";
export { VoteCard } from "./components/vote-card";
export {
  refreshTally,
  useElection,
  useElectionBallots,
  useElectionEvents,
  useElectionGroup,
  useElectionResults,
  useElections,
  useOpenedBallots,
  useRevealBallots,
  useVote,
  useVoteEligibility,
  type RevealProgress,
  type VoteEligibility,
  type VoteStep,
} from "./hooks";
export {
  chunk,
  pendingReveals,
  provisionalTally,
  REVEAL_BATCH_SIZE,
  type CastBallot,
  type OpenedBallot,
  type ProvisionalTally,
} from "./ballots";
export { electionKeys } from "./keys";
export { formatCountdown, formatTimestamp, phaseAt, phaseLabels, type ElectionPhase } from "./phase";
export {
  ElectionNotFoundError,
  electionBallotsQueryOptions,
  electionGroupQueryOptions,
  electionQueryOptions,
  electionResultsQueryOptions,
  electionsQueryOptions,
  openedBallotsQueryOptions,
  type ElectionDetails,
  type ElectionResults,
} from "./queries";
