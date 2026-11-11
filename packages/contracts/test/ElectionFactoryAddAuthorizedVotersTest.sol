// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {ElectionFactoryTestBase} from "./ElectionFactoryTestBase.sol";

contract ElectionFactoryAddAuthorizedVotersTest is ElectionFactoryTestBase {
    function test_shouldRevertWithOnlyOwner(address sender, address[] calldata voters) public notOwner(sender) {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        factory.addAuthorizedVoters(voters);
    }

    function test_shouldRevertWithInvalidVoterAddress(address[] memory voters, uint256 zeroIndex) public {
        vm.assume(voters.length > 0);
        zeroIndex = bound(zeroIndex, 0, voters.length - 1);
        voters[zeroIndex] = address(0);
        vm.expectRevert(ElectionFactory.InvalidVoterAddress.selector);
        factory.addAuthorizedVoters(voters);
    }

    function test_shouldStoreIsAuthorized(address[] memory voters) public {
        for (uint256 i = 0; i < voters.length; ++i) {
            if (voters[i] == address(0)) {
                voters[i] = address(1);
            }
        }

        factory.addAuthorizedVoters(voters);

        for (uint256 i = 0; i < voters.length; ++i) {
            assertTrue(factory.isAuthorized(voters[i]));
        }
    }
}
