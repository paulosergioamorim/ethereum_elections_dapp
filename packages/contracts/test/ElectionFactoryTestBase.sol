// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {ElectionFactory} from "../contracts/ElectionFactory.sol";
import {MockSemaphore} from "../contracts/mocks/MockSemaphore.sol";

/// @dev Base comum dos testes de ElectionFactory. É abstrata e não tem funções `test*`,
/// então o Hardhat não a executa como teste.
abstract contract ElectionFactoryTestBase is Test {
    ElectionFactory factory;
    MockSemaphore sem;
    address owner;

    modifier notOwner(address sender) {
        vm.assume(sender != owner);
        _;
    }

    modifier authorizedVoters(address[] memory voters) {
        for (uint256 i = 0; i < voters.length; ++i) {
            if (voters[i] == address(0)) {
                voters[i] = address(1);
            }
        }

        factory.addAuthorizedVoters(voters);
        _;
    }

    modifier validIdCommitment(uint256 identityCommitment) {
        vm.assume(identityCommitment != 0);
        _;
    }

    modifier authorizedVoter(address voter) {
        vm.assume(voter != address(0));
        address[] memory voters = new address[](1);
        voters[0] = voter;
        factory.addAuthorizedVoters(voters);
        _;
    }

    modifier registeredVoter(address voter, uint256 identityCommitment) {
        vm.assume(voter != address(0) && identityCommitment != 0);
        address[] memory voters = new address[](1);
        voters[0] = voter;
        factory.addAuthorizedVoters(voters);
        vm.prank(voter);
        factory.registerIdentityCommitment(identityCommitment);
        _;
    }

    function setUp() public {
        sem = new MockSemaphore();
        factory = new ElectionFactory(sem);
        owner = factory.owner();
    }
}
