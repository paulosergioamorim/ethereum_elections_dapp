// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Election} from "../contracts/Election.sol";
import {CreateElectionCommand, IElectionSemaphore} from "../contracts/Types.sol";
import {ElectionTestBase} from "./ElectionTestBase.sol";
import {ElectionTestLib} from "./ElectionTestLib.sol";

contract ElectionInitializeTest is ElectionTestBase {
    function test_shouldRevertWithInvalidSemaphore() public {
        vm.expectRevert(Election.InvalidSemaphore.selector);
        election.initialize(
            IElectionSemaphore(address(0)),
            groupId,
            merkleTreeRoot,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldRevertWithInvalidMerkleRoot() public {
        vm.expectRevert(Election.InvalidMerkleRoot.selector);
        election.initialize(
            sem,
            groupId,
            0,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldRevertWithInvalidVotingStart(
        uint64 votingStart
    ) public {
        vm.warp(uint256(votingStart) + 1);
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.votingStart = votingStart;
        vm.expectRevert(Election.InvalidVotingStart.selector);
        election.initialize(sem, groupId, merkleTreeRoot, command);
    }

    function test_shouldRevertWithInvalidVotingDuration(
        uint64 votingStart,
        uint64 votingEnd
    ) public {
        votingStart = uint64(bound(votingStart, block.timestamp, type(uint64).max));
        votingEnd = uint64(bound(votingEnd, 0, votingStart));
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.votingStart = votingStart;
        command.votingEnd = votingEnd;
        vm.expectRevert(Election.InvalidVotingDuration.selector);
        election.initialize(sem, groupId, merkleTreeRoot, command);
    }

    function test_shouldRevertWithInvalidCandidatesQuantity(
        uint256 quantity
    ) public {
        quantity = bound(quantity, 0, 1);
        string[] memory candidates = new string[](quantity);
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.candidates = candidates;
        vm.expectRevert(Election.InvalidCandidatesQuantity.selector);
        election.initialize(sem, groupId, merkleTreeRoot, command);
    }

    function test_shouldRevertWithInvalidInitialization() public {
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            ElectionTestLib.validCommand()
        );
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldRevertWithInvalidInitializationOnImplementation()
        public
    {
        Election implementation = new Election();
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldStoreTallyWithZeros(uint256 quantity) public {
        quantity = bound(quantity, 2, 10);
        string[] memory candidates = new string[](quantity);
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.candidates = candidates;
        election.initialize(sem, groupId, merkleTreeRoot, command);

        (uint256[] memory tally, , ) = election.results();
        assertEq(tally.length, quantity);

        for (uint256 i = 0; i < tally.length; ++i) {
            assertEq(tally[i], 0);
        }
    }
}
