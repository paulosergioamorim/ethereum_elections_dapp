// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Election} from "../contracts/Election.sol";
import {Candidacy} from "../contracts/Candidacy.sol";
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
            nominees,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldRevertWithInvalidMerkleRoot() public {
        vm.expectRevert(Election.InvalidMerkleRoot.selector);
        election.initialize(
            sem,
            groupId,
            0,
            nominees,
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
        election.initialize(sem, groupId, merkleTreeRoot, nominees, command);
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
        election.initialize(sem, groupId, merkleTreeRoot, nominees, command);
    }

    function test_shouldRevertWithInvalidNominationEnd(
        uint64 nominationEnd
    ) public {
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        nominationEnd = uint64(
            bound(nominationEnd, 0, block.timestamp)
        );
        command.nominationEnd = nominationEnd;
        vm.expectRevert(Election.InvalidNominationEnd.selector);
        election.initialize(sem, groupId, merkleTreeRoot, nominees, command);
    }

    function test_shouldRevertWithInvalidNominationEndAfterVotingStart(
        uint64 extra
    ) public {
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.nominationEnd = command.votingStart + uint64(bound(extra, 1, 1 days));
        vm.expectRevert(Election.InvalidNominationEnd.selector);
        election.initialize(sem, groupId, merkleTreeRoot, nominees, command);
    }

    function test_shouldAcceptNominationEndEqualToVotingStart() public {
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        command.nominationEnd = command.votingStart;
        election.initialize(sem, groupId, merkleTreeRoot, nominees, command);
        assertEq(election.nominationEnd(), command.votingStart);
    }

    function test_shouldStoreNominationEndAndFactory() public initialized {
        assertEq(election.nominationEnd(), ElectionTestLib.validCommand().nominationEnd);
        assertEq(address(election.factory()), address(nominees));
    }

    function test_shouldRevertWithInvalidInitialization() public {
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            nominees,
            ElectionTestLib.validCommand()
        );
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            nominees,
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
            nominees,
            ElectionTestLib.validCommand()
        );
    }

    function test_shouldReportOneZeroTallyEntryPerNominee() public initialized {
        (uint256[] memory tally, , ) = election.results();
        assertEq(tally.length, 2);
        assertEq(tally[0], 0);
        assertEq(tally[1], 0);
    }

    function test_shouldAcceptAnElectionWithoutNominees() public {
        nominees.set(new Candidacy[](0));
        election.initialize(
            sem,
            groupId,
            merkleTreeRoot,
            nominees,
            ElectionTestLib.validCommand()
        );
        (uint256[] memory tally, , ) = election.results();
        assertEq(tally.length, 0);
    }
}
