// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";
import {MockSemaphore} from "../contracts/mocks/MockSemaphore.sol";

contract ElectionFactoryRegisterIdentityCommitmentTest is
    ElectionFactoryTestBase
{
    function test_shouldRevertWithUnauthorizedVoter(
        address sender,
        uint256 identityCommitment
    ) public {
        vm.expectRevert(ElectionFactory.UnauthorizedVoter.selector);
        vm.prank(sender);
        factory.registerIdentityCommitment(identityCommitment);
    }

    function test_shouldRevertWithCommitmentCannotBeZero(
        address voter
    ) public authorizedVoter(voter) {
        vm.expectRevert(ElectionFactory.CommitmentCannotBeZero.selector);
        vm.prank(voter);
        factory.registerIdentityCommitment(0);
    }

    function test_shouldRevertWithAlreadyRegisteredIdentityCommitment(
        address voter,
        uint256 identityCommitment,
        uint256 newIdentityCommitment
    )
        public
        registeredVoter(voter, identityCommitment)
        validIdCommitment(newIdentityCommitment)
    {
        vm.expectRevert(
            ElectionFactory.AlreadyRegisteredIdentityCommitment.selector
        );
        vm.startPrank(voter);
        factory.registerIdentityCommitment(newIdentityCommitment);
    }

    function test_shouldRevertWithLeafAlreadyExists(
        address voter,
        address otherVoter,
        uint256 identityCommitment
    )
        public
        registeredVoter(voter, identityCommitment)
        authorizedVoter(otherVoter)
    {
        vm.assume(voter != otherVoter);
        vm.expectRevert(MockSemaphore.LeafAlreadyExists.selector);
        vm.prank(otherVoter);
        factory.registerIdentityCommitment(identityCommitment);
    }

    function test_shouldStoreCommitmentOf(
        address voter,
        uint256 identityCommitment
    ) public authorizedVoter(voter) validIdCommitment(identityCommitment) {
        vm.prank(voter);
        factory.registerIdentityCommitment(identityCommitment);
        assertEq(factory.commitmentOf(voter), identityCommitment);
    }

    function test_shouldCallAddMember(
        address voter,
        uint256 identityCommitment
    ) public authorizedVoter(voter) validIdCommitment(identityCommitment) {
        vm.expectCall(address(sem), abi.encodeCall(sem.addMember, (factory.groupId(), identityCommitment)));
        vm.prank(voter);
        factory.registerIdentityCommitment(identityCommitment);
    }
}
