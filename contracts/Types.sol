// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {ISemaphoreGroups} from "@semaphore-protocol/contracts/interfaces/ISemaphoreGroups.sol";

struct CreateElectionCommand {
    string title;
    string[] candidates;
    uint64 votingStart;
    uint64 votingEnd;
}

enum ElectionPhase {
    Scheduled,
    Voting,
    Tally
}

interface IElectionSemaphore is ISemaphore, ISemaphoreGroups {}
