// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";

contract ElectionFactoryRemoveVoterTest is ElectionFactoryTestBase {
    function test_shouldRevertWithOnlyOwner(
        address sender,
        address voter,
        uint256[] calldata siblings
    ) public notOwner(sender) {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        factory.removeVoter(voter, siblings);
    }

    function test_shouldRevertWithUnauthorizedVoter(
        address voter,
        uint256[] calldata siblings
    ) public {
        vm.expectRevert(ElectionFactory.UnauthorizedVoter.selector);
        factory.removeVoter(voter, siblings);
    }

    function test_shouldClearIsAuthorized(
        address voter,
        uint256[] calldata siblings
    ) public authorizedVoter(voter) {
        factory.removeVoter(voter, siblings);
        assertFalse(factory.isAuthorized(voter));
    }

    function test_shouldClearCommitmentOf(
        address voter,
        uint256 identityCommitment,
        uint256[] calldata siblings
    ) public registeredVoter(voter, identityCommitment) {
        factory.removeVoter(voter, siblings);
        assertEq(factory.commitmentOf(voter), 0);
    }

    function test_shouldCallRemoveMember(
        address voter,
        uint256 identityCommitment,
        uint256[] calldata siblings
    ) public registeredVoter(voter, identityCommitment) {
        vm.expectCall(
            address(sem),
            abi.encodeCall(
                sem.removeMember,
                (factory.groupId(), identityCommitment, siblings)
            )
        );
        factory.removeVoter(voter, siblings);
    }

    function test_shouldNotCallRemoveMember(
        address voter,
        uint256[] calldata siblings
    ) public authorizedVoter(voter) {
        vm.expectCall(address(sem), abi.encodeWithSelector(sem.removeMember.selector), 0);
        factory.removeVoter(voter, siblings);
    }
}
