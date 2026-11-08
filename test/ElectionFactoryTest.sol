// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {MockSemaphore} from "../contracts/mocks/MockSemaphore.sol";

contract ElectionFactoryTest is Test {
    ElectionFactory factory;
    address owner;
    address[] voters = [address(1), address(2), address(3)];

    function setUp() public {
        MockSemaphore sem = new MockSemaphore();
        factory = new ElectionFactory(sem);
        owner = factory.owner();
    }

    function test_addAuthorizedVoters_shouldRevertWithOnlyOwner() public {
        vm.startPrank(voters[0]);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                voters[0]
            )
        );
        factory.addAuthorizedVoters(voters);
    }

    function test_addAuthorizedVoters_shouldRevertWithInvalidVoterAddress()
        public
    {
        vm.startPrank(owner);
        voters[2] = address(0);
        vm.expectRevert(ElectionFactory.InvalidVoterAddress.selector);
        factory.addAuthorizedVoters(voters);
    }

    function test_renounceOwnership_shouldRevertWithRenounceDisabled() public {
        vm.startPrank(owner);
        vm.expectRevert(ElectionFactory.RenounceDisabled.selector);
        factory.renounceOwnership();
    }
}
