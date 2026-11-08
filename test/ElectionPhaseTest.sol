// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ElectionPhase} from "../contracts/Types.sol";
import {ElectionTestBase} from "./ElectionTestBase.sol";

contract ElectionPhaseTest is ElectionTestBase {
    function test_shouldBeScheduledBeforeVotingStart(
        uint256 timestamp
    ) public initialized {
        timestamp = bound(
            timestamp,
            block.timestamp,
            election.votingStart() - 1
        );
        vm.warp(timestamp);
        assertTrue(election.phase() == ElectionPhase.Scheduled);
    }

    function test_shouldBeVotingAtVotingStart() public initialized {
        vm.warp(election.votingStart());
        assertTrue(election.phase() == ElectionPhase.Voting);
    }

    function test_shouldBeVotingBeforeVotingEnd(
        uint256 timestamp
    ) public initialized {
        timestamp = bound(
            timestamp,
            election.votingStart(),
            election.votingEnd() - 1
        );
        vm.warp(timestamp);
        assertTrue(election.phase() == ElectionPhase.Voting);
    }

    function test_shouldBeTallyAtVotingEnd() public initialized {
        vm.warp(election.votingEnd());
        assertTrue(election.phase() == ElectionPhase.Tally);
    }

    function test_shouldBeTallyAfterVotingEnd(
        uint256 timestamp
    ) public initialized {
        timestamp = bound(timestamp, election.votingEnd(), type(uint256).max);
        vm.warp(timestamp);
        assertTrue(election.phase() == ElectionPhase.Tally);
    }
}
