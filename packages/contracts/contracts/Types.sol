// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {ISemaphoreGroups} from "@semaphore-protocol/contracts/interfaces/ISemaphoreGroups.sol";
import {Candidacy} from "./Candidacy.sol";

struct CreateElectionCommand {
    string title;
    uint64 nominationEnd;
    uint64 votingStart;
    uint64 votingEnd;
}

enum ElectionPhase {
    Nomination,
    Scheduled,
    Voting,
    Tally
}

interface IElectionSemaphore is ISemaphore, ISemaphoreGroups {}

/// @dev O que a eleição lê da factory: os indicados, na ordem do voto.
interface INominees {
    function nomineesOf(address election) external view returns (Candidacy[] memory);
}
