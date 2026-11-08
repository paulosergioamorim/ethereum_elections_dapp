// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Election} from "../contracts/Election.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {CreateElectionCommand} from "../contracts/Types.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";
import {ElectionTestLib} from "./ElectionTestLib.sol";

contract ElectionFactoryCreateElectionTest is ElectionFactoryTestBase {
    function test_shouldRevertWithOnlyOwner(
        address sender
    ) public notOwner(sender) {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        vm.prank(sender);
        factory.createElection(ElectionTestLib.validCommand());
    }

    function test_shouldRevertWithInvalidMerkleRoot() public {
        vm.expectRevert(Election.InvalidMerkleRoot.selector);
        factory.createElection(ElectionTestLib.validCommand());
    }

    function test_shouldStoreIsElection(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election = factory.createElection(ElectionTestLib.validCommand());
        assertTrue(factory.isElection(address(election)));
    }

    function test_shouldStoreElections(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election = factory.createElection(ElectionTestLib.validCommand());
        Election[] memory elections = factory.elections();
        assertEq(address(elections[elections.length - 1]), address(election));
    }

    function test_shouldStoreMerkleTreeRoot(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election = factory.createElection(ElectionTestLib.validCommand());
        assertEq(
            election.merkleTreeRoot(),
            sem.getMerkleTreeRoot(factory.groupId())
        );
    }

    function test_shouldStoreGroupId(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election = factory.createElection(ElectionTestLib.validCommand());
        assertEq(election.groupId(), factory.groupId());
    }

    function test_shouldStoreCommand(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election = factory.createElection(ElectionTestLib.validCommand());
        CreateElectionCommand memory command = ElectionTestLib.validCommand();
        assertEq(election.title(), command.title);
        assertEq(election.candidates(), command.candidates);
        assertEq(election.votingStart(), command.votingStart);
        assertEq(election.votingEnd(), command.votingEnd);
    }

    function test_shouldStoreCreatedAtBlock(
        address voter,
        uint256 identityCommitment,
        uint64 blockNumber
    ) public registeredVoter(voter, identityCommitment) {
        vm.roll(blockNumber);
        Election election = factory.createElection(ElectionTestLib.validCommand());
        assertEq(election.createdAtBlock(), blockNumber);
    }

    function test_shouldCreateDistinctElections(
        address voter,
        uint256 identityCommitment
    ) public registeredVoter(voter, identityCommitment) {
        Election election1 = factory.createElection(ElectionTestLib.validCommand());
        Election election2 = factory.createElection(ElectionTestLib.validCommand());
        assertNotEq(address(election1), address(election2));
    }
}
